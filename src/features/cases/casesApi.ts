/**
 * Health case management data access.
 *
 * MOCK: reads and writes the in-memory demo store. OUTSTANDING endpoints (BE-017): list/filter,
 * detail, assign, follow-up actions, notes, status transitions (invalid ones return 409), close with
 * a reason (officers only) and manual reopen. The API must enforce the officer-only rules too.
 */
import type { Actor, Animal, HealthCase, StaffMember } from '@/domain/types';
import { summariseCase } from '@/mock/ai';
import { mockDb, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { ScopeError, canSeeAnimal } from '@/mock/scope';
import { isoDateOf } from '@/utils/dates';

export class CaseError extends Error {
  readonly kind: 'not_found' | 'forbidden' | 'invalid_transition' | 'reason_required' | 'empty';
  constructor(kind: CaseError['kind'], message: string) {
    super(message);
    this.name = 'CaseError';
    this.kind = kind;
  }
}

/** Reasons offered when closing a case. */
export const CLOSE_REASONS = ['Resolved', 'Resolved after treatment', 'No longer a concern', 'Animal released', 'Duplicate case'] as const;

export interface CaseListItem {
  healthCase: HealthCase;
  animal: Animal;
  assignee: StaffMember | null;
  overdueFollowUps: number;
}

function overdueCount(healthCase: HealthCase, today: string): number {
  return healthCase.followUps.filter((f) => !f.done && f.dueDate < today).length;
}

function staffById(id: string | null): StaffMember | null {
  return mockDb.staff.find((member) => member.id === id) ?? null;
}

/** All cases the user may see, most recently updated first. */
export async function listCases(actor: Actor, now: number = Date.now()): Promise<CaseListItem[]> {
  await simulateLatency();
  const today = isoDateOf(now);
  return overTheWire(mockDb.cases
    .flatMap((healthCase) => {
      const animal = mockDb.animals.find((a) => a.id === healthCase.animalId);
      if (!animal || !canSeeAnimal(actor, animal)) return [];
      return [{ healthCase, animal, assignee: staffById(healthCase.assigneeId), overdueFollowUps: overdueCount(healthCase, today) }];
    })
    .sort((a, b) => {
      // Open work first, then most recently updated.
      const rank = (c: HealthCase) => (c.status === 'closed' ? 1 : 0);
      return rank(a.healthCase) - rank(b.healthCase) || b.healthCase.updatedAt - a.healthCase.updatedAt;
    }));
}

export type CaseFilter = 'open' | 'review' | 'last7' | 'mine';

/** Filters combine (AND). No filter selected shows every case. */
export function filterCases(items: readonly CaseListItem[], filters: ReadonlySet<CaseFilter>, actorId: string, query: string, now: number = Date.now()): CaseListItem[] {
  const weekAgo = now - 7 * 24 * 60 * 60_000;
  const q = query.trim().toLowerCase();
  return items.filter(({ healthCase, animal }) => {
    if (filters.has('open') && healthCase.status === 'closed') return false;
    if (filters.has('review') && healthCase.status !== 'review') return false;
    if (filters.has('last7') && healthCase.updatedAt < weekAgo) return false;
    if (filters.has('mine') && healthCase.assigneeId !== actorId) return false;
    if (!q) return true;
    return [healthCase.id, healthCase.finding, animal.kennel, animal.name].some((value) => value.toLowerCase().includes(q));
  });
}

export interface CaseDetail {
  healthCase: HealthCase;
  animal: Animal;
  assignee: StaffMember | null;
  summary: string;
  /** An observation for this case still waiting for AI confirmation, if any. */
  pendingObservationId: string | null;
}

export async function getCase(actor: Actor, id: string, now: number = Date.now()): Promise<CaseDetail | null> {
  await simulateLatency();
  const healthCase = mockDb.cases.find((c) => c.id === id);
  if (!healthCase) return null;
  const animal = mockDb.animals.find((a) => a.id === healthCase.animalId);
  if (!animal) return null;
  if (!canSeeAnimal(actor, animal)) throw new ScopeError();
  const pending = mockDb.observations.find(
    (o) => o.status === 'awaiting-confirmation' && o.ai?.suggestion.caseId === healthCase.id,
  );
  return overTheWire({
    healthCase,
    animal,
    assignee: staffById(healthCase.assigneeId),
    summary: summariseCase(healthCase, now),
    pendingObservationId: pending?.id ?? null,
  });
}

/** Officer-side staff who can be assigned, with the current user added if missing. */
export async function listAssignableStaff(actor: Actor): Promise<StaffMember[]> {
  await simulateLatency(0);
  const staff = mockDb.staff.filter((member) => member.role !== 'contractor');
  return overTheWire(actor.role === 'officer' && !staff.some((m) => m.id === actor.id)
    ? [{ id: actor.id, name: actor.name, role: 'officer' }, ...staff]
    : staff);
}

function findCase(id: string): HealthCase {
  const healthCase = mockDb.cases.find((c) => c.id === id);
  if (!healthCase) throw new CaseError('not_found', 'This case no longer exists.');
  return healthCase;
}

function touch(healthCase: HealthCase, now: number) {
  healthCase.updatedAt = now;
}

export interface CaseActionBase {
  caseId: string;
  actor: Actor;
  now?: number;
}

export async function assignCase({ caseId, staffId, actor, now = Date.now() }: CaseActionBase & { staffId: string }): Promise<void> {
  await simulateLatency();
  if (actor.role !== 'officer') throw new CaseError('forbidden', 'Only officers can reassign cases.');
  const healthCase = findCase(caseId);
  let member = staffById(staffId);
  if (!member && staffId === actor.id) {
    member = { id: actor.id, name: actor.name, role: 'officer' };
    mockDb.staff.push(member);
  }
  if (!member) throw new CaseError('not_found', 'That person was not found.');
  healthCase.assigneeId = member.id;
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'assigned', title: `Assigned to ${member.name}`, by: actor.name });
  touch(healthCase, now);
}

export async function addFollowUp({ caseId, text, dueDate, actor, now = Date.now() }: CaseActionBase & { text: string; dueDate: string }): Promise<void> {
  await simulateLatency();
  const trimmed = text.trim();
  if (!trimmed) throw new CaseError('empty', 'Describe the follow-up action.');
  const healthCase = findCase(caseId);
  if (healthCase.status === 'closed') throw new CaseError('invalid_transition', 'Reopen the case to add follow-up actions.');
  healthCase.followUps.push({ id: newMockId('fu'), text: trimmed, dueDate, done: false });
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'follow-up', title: `Follow-up added · ${trimmed}`, by: actor.name });
  touch(healthCase, now);
}

export async function setFollowUpDone({ caseId, followUpId, done, actor, now = Date.now() }: CaseActionBase & { followUpId: string; done: boolean }): Promise<void> {
  await simulateLatency(150);
  const healthCase = findCase(caseId);
  const followUp = healthCase.followUps.find((f) => f.id === followUpId);
  if (!followUp) throw new CaseError('not_found', 'That follow-up action was not found.');
  followUp.done = done;
  healthCase.events.push({
    id: newMockId('ev'),
    at: now,
    kind: 'follow-up',
    title: `${done ? 'Completed' : 'Reopened'} follow-up · ${followUp.text}`,
    by: actor.name,
  });
  touch(healthCase, now);
}

export async function addNote({ caseId, text, actor, now = Date.now() }: CaseActionBase & { text: string }): Promise<void> {
  await simulateLatency();
  const trimmed = text.trim();
  if (!trimmed) throw new CaseError('empty', 'Write a note first.');
  const healthCase = findCase(caseId);
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'note', title: 'Note added', detail: trimmed, by: actor.name });
  touch(healthCase, now);
}

export async function markReviewed({ caseId, actor, now = Date.now() }: CaseActionBase): Promise<void> {
  await simulateLatency();
  const healthCase = findCase(caseId);
  if (healthCase.status !== 'review') throw new CaseError('invalid_transition', 'This case does not need review.');
  healthCase.status = 'open';
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'reviewed', title: 'Review completed · case open', by: actor.name });
  touch(healthCase, now);
}

/** Close requires a reason (FE-016) and an officer (BE-017). */
export async function closeCase({ caseId, reason, note, actor, now = Date.now() }: CaseActionBase & { reason: string; note: string }): Promise<void> {
  await simulateLatency();
  if (actor.role !== 'officer') throw new CaseError('forbidden', 'Only officers can close cases.');
  if (!reason.trim()) throw new CaseError('reason_required', 'Choose a reason for closing the case.');
  const healthCase = findCase(caseId);
  if (healthCase.status === 'closed') throw new CaseError('invalid_transition', 'This case is already closed.');
  healthCase.status = 'closed';
  healthCase.closedAt = now;
  healthCase.closeReason = reason.trim();
  healthCase.events.push({
    id: newMockId('ev'),
    at: now,
    kind: 'closed',
    title: `Case closed · ${reason.trim()}`,
    detail: note.trim() || undefined,
    by: actor.name,
  });
  touch(healthCase, now);
}

/** Manual reopen. Every earlier event stays linked, so the full history is shown (FE-016). */
export async function reopenCase({ caseId, actor, now = Date.now() }: CaseActionBase): Promise<void> {
  await simulateLatency();
  if (actor.role !== 'officer') throw new CaseError('forbidden', 'Only officers can reopen cases.');
  const healthCase = findCase(caseId);
  if (healthCase.status !== 'closed') throw new CaseError('invalid_transition', 'This case is already open.');
  healthCase.status = 'open';
  healthCase.reopenedAt = now;
  healthCase.closedAt = null;
  healthCase.closeReason = null;
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'reopened', title: 'Case reopened manually', by: actor.name });
  touch(healthCase, now);
}
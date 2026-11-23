/**
 * Health case management data access.
 *
 * With EXPO_PUBLIC_API_URL set and online, cases come from the backend (casesBackend.ts): the list
 * (GET /cases), detail (GET /cases/{caseId}), assign and follow-up actions (PATCH /cases/{caseId}) and
 * close with a reason (POST /cases/{caseId}/close). Cases of demo animals stay on the in-memory store.
 * OUTSTANDING endpoints: case notes, "mark as reviewed" and a manual reopen. A backend case is reopened
 * by routing a related observation to it; CaseDetail.actions tells the screen what it can offer.
 */
import { ApiError, isApiEnabled } from '@/api';
import type { Actor, Animal, HealthCase, StaffMember } from '@/domain/types';
import { syncAnimals } from '@/features/animals/animalSource';
import { summariseCase } from '@/mock/ai';
import { mockDb, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { ScopeError, canSeeAnimal, isBackendId } from '@/mock/scope';
import { isOnline } from '@/mock/sync';
import { isoDateOf } from '@/utils/dates';

import * as backend from './casesBackend';

export class CaseError extends Error {
  readonly kind: 'not_found' | 'forbidden' | 'invalid_transition' | 'reason_required' | 'empty' | 'rejected' | 'unsupported' | 'offline';
  constructor(kind: CaseError['kind'], message: string) {
    super(message);
    this.name = 'CaseError';
    this.kind = kind;
  }
}

/**
 * True when the case lives on the backend: the API is on and it is not a demo case (demo cases belong
 * to demo animals, whose ids are not numeric).
 */
function isBackendCase(caseId: string): boolean {
  return isApiEnabled() && !mockDb.cases.some((c) => c.id === caseId && !isBackendId(c.animalId));
}

/** Changes to a backend case need the server. */
function requireOnline(): void {
  if (!isOnline()) throw new CaseError('offline', 'Case changes need a connection. Turn off "Work offline" and try again.');
}

/** The server's rejection as a CaseError with its message; anything else (5xx, network) is rethrown. */
function caseErrorFrom(error: unknown): never {
  if (error instanceof ApiError && error.rejected) {
    const kind = error.status === 404 ? 'not_found' : error.status === 403 ? 'forbidden' : error.status === 409 ? 'invalid_transition' : 'rejected';
    throw new CaseError(kind, error.message);
  }
  throw error;
}

async function onBackend<T>(call: () => Promise<T>): Promise<T> {
  requireOnline();
  try {
    return await call();
  } catch (error) {
    return caseErrorFrom(error);
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

/**
 * Refreshes the store's backend cases (GET /cases) for screens that derive from them (Operations, the
 * animal list and profile, routing choices). Does nothing without the API or while working offline.
 */
export async function syncCases(): Promise<void> {
  if (isApiEnabled() && isOnline()) await backend.listCases();
}

/** All cases the user may see: open work first, then most recently updated. */
export async function listCases(actor: Actor, now: number = Date.now()): Promise<CaseListItem[]> {
  await simulateLatency();
  await syncAnimals();
  const today = isoDateOf(now);
  // Online with the API, the server lists the backend cases (with their animals, even released ones).
  const fromBackend: CaseListItem[] = isApiEnabled() && isOnline() ? await backend.listCases() : [];
  const listed = new Set(fromBackend.map((item) => item.healthCase.id));
  const fromStore = mockDb.cases.flatMap((healthCase) => {
    if (listed.has(healthCase.id)) return [];
    const animal = mockDb.animals.find((a) => a.id === healthCase.animalId);
    if (!animal || !canSeeAnimal(actor, animal)) return [];
    return [{ healthCase, animal, assignee: staffById(healthCase.assigneeId), overdueFollowUps: overdueCount(healthCase, today) }];
  });
  return overTheWire([...fromBackend, ...fromStore]
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
  /** Actions the case supports. Backend cases have no endpoints yet for notes, review or a manual reopen. */
  actions: { note: boolean; markReviewed: boolean; reopen: boolean };
}

const ALL_ACTIONS: CaseDetail['actions'] = { note: true, markReviewed: true, reopen: true };
const BACKEND_ACTIONS: CaseDetail['actions'] = { note: false, markReviewed: false, reopen: false };

export async function getCase(actor: Actor, id: string, now: number = Date.now()): Promise<CaseDetail | null> {
  await simulateLatency();
  if (isBackendCase(id) && isOnline()) {
    try {
      return overTheWire({ ...(await backend.getCase(id)), actions: BACKEND_ACTIONS });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      if (error instanceof ApiError && error.status === 403) throw new ScopeError();
      throw error;
    }
  }
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
    actions: isBackendId(healthCase.animalId) ? BACKEND_ACTIONS : ALL_ACTIONS,
  });
}

/**
 * Officer-side staff who can be assigned to the case, with the current user added if missing. There is
 * no staff list endpoint, so a backend case offers the staff seen as assignees on backend cases.
 */
export async function listAssignableStaff(actor: Actor, caseId: string): Promise<StaffMember[]> {
  await simulateLatency(0);
  const onBackendCase = isBackendCase(caseId);
  const staff = mockDb.staff.filter((member) => member.role !== 'contractor' && isBackendId(member.id) === onBackendCase);
  const canAddSelf = !onBackendCase || isBackendId(actor.id);
  return overTheWire(actor.role === 'officer' && canAddSelf && !staff.some((m) => m.id === actor.id)
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
  if (isBackendCase(caseId)) {
    await onBackend(() => backend.patchCase(caseId, staffId, null));
    return;
  }
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
  if (isBackendCase(caseId)) {
    await onBackend(async () => {
      // The PATCH replaces the whole list, so start from the server's current one.
      const { healthCase } = await backend.getCase(caseId);
      if (healthCase.status === 'closed') throw new CaseError('invalid_transition', 'Reopen the case to add follow-up actions.');
      await backend.patchCase(caseId, healthCase.assigneeId, [...healthCase.followUps, { id: null, text: trimmed, dueDate, done: false }]);
    });
    return;
  }
  const healthCase = findCase(caseId);
  if (healthCase.status === 'closed') throw new CaseError('invalid_transition', 'Reopen the case to add follow-up actions.');
  healthCase.followUps.push({ id: newMockId('fu'), text: trimmed, dueDate, done: false });
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'follow-up', title: `Follow-up added · ${trimmed}`, by: actor.name });
  touch(healthCase, now);
}

export async function setFollowUpDone({ caseId, followUpId, done, actor, now = Date.now() }: CaseActionBase & { followUpId: string; done: boolean }): Promise<void> {
  await simulateLatency(150);
  if (isBackendCase(caseId)) {
    await onBackend(async () => {
      const { healthCase } = await backend.getCase(caseId);
      if (!healthCase.followUps.some((f) => f.id === followUpId)) throw new CaseError('not_found', 'That follow-up action was not found.');
      await backend.patchCase(caseId, healthCase.assigneeId, healthCase.followUps.map((f) => (f.id === followUpId ? { ...f, done } : f)));
    });
    return;
  }
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
  if (isBackendCase(caseId)) throw new CaseError('unsupported', 'Notes can’t be added to this case yet.');
  const healthCase = findCase(caseId);
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'note', title: 'Note added', detail: trimmed, by: actor.name });
  touch(healthCase, now);
}

export async function markReviewed({ caseId, actor, now = Date.now() }: CaseActionBase): Promise<void> {
  await simulateLatency();
  if (isBackendCase(caseId)) throw new CaseError('unsupported', 'This case can’t be marked as reviewed yet.');
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
  if (isBackendCase(caseId)) {
    await onBackend(() => backend.closeCase(caseId, reason.trim(), note));
    return;
  }
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
  if (isBackendCase(caseId)) throw new CaseError('unsupported', 'Reopen this case by routing a related observation to it.');
  const healthCase = findCase(caseId);
  if (healthCase.status !== 'closed') throw new CaseError('invalid_transition', 'This case is already open.');
  healthCase.status = 'open';
  healthCase.reopenedAt = now;
  healthCase.closedAt = null;
  healthCase.closeReason = null;
  healthCase.events.push({ id: newMockId('ev'), at: now, kind: 'reopened', title: 'Case reopened manually', by: actor.name });
  touch(healthCase, now);
}
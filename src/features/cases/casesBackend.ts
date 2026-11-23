/**
 * Health case endpoints on the real backend (Postman "Case Management (AQC)"). Used by casesApi.ts when
 * EXPO_PUBLIC_API_URL is set.
 *
 * - GET   /api/v1/cases                 cases in scope, open/review first (contractor scope applied by the server)
 * - GET   /api/v1/cases/{caseId}        one case by case number ("C-2026-0142") or numeric id
 * - PATCH /api/v1/cases/{caseId}        assignee and/or the full follow-up list (officers and supervisors)
 * - POST  /api/v1/cases/{caseId}/close  close with a reason (officers and supervisors)
 *
 * Cases are keyed by their case number. The server's cases are merged into the store (replacing the
 * cases of backend animals), so the animal profile, Operations and the routing choices see them too.
 * No endpoints yet for case notes, "mark as reviewed" or a manual reopen (a case is reopened by routing
 * an observation to it), so casesApi.ts offers those only on demo cases. Errors are thrown as ApiError.
 */
import { unwrap } from '@/api';
import { getApiV1Cases, getApiV1CasesByCaseId, patchApiV1CasesByCaseId, postApiV1CasesByCaseIdClose } from '@/api/generated';
import type {
  CaseDetailResponse,
  CaseEventResponse,
  CaseListItemResponse,
  FollowUpInput,
  HealthCaseResponse,
  StaffMemberResponse,
} from '@/api/generated';
import type {
  Animal,
  CaseEvent,
  CaseEventKind,
  CaseStatus,
  ClinicalSystem,
  FollowUpAction,
  HealthCase,
  StaffMember,
  StaffRole,
} from '@/domain/types';
import { toAnimal, toTime } from '@/features/medication/medicationBackend';
import { mockDb } from '@/mock/db';
import { isBackendId } from '@/mock/scope';

const CASE_STATUSES: readonly CaseStatus[] = ['review', 'open', 'closed'];
const SYSTEMS: readonly ClinicalSystem[] = ['GI', 'Respiratory', 'Skin', 'Eyes', 'Ears', 'General', 'Musculoskeletal'];
const EVENT_KINDS: readonly CaseEventKind[] = ['opened', 'observation', 'inspection', 'assigned', 'note', 'reviewed', 'closed', 'reopened', 'follow-up'];
const ROLES: readonly StaffRole[] = ['officer', 'vet', 'supervisor', 'contractor'];

function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  const lower = typeof value === 'string' ? value.toLowerCase() : value;
  return values.find((v) => v === value || v.toLowerCase() === lower) ?? fallback;
}

function optionalTime(value: number | string | null): number | null {
  return value === null ? null : toTime(value);
}

function optionalId(value: number | string | null): string | undefined {
  return value === null ? undefined : String(value);
}

function toEvent(dto: CaseEventResponse): CaseEvent {
  return {
    id: String(dto.id),
    at: toTime(dto.at),
    // An unknown kind is shown as a plain history entry with its title.
    kind: oneOf(EVENT_KINDS, dto.kind, 'reviewed'),
    title: dto.title,
    by: dto.by,
    ...(dto.detail ? { detail: dto.detail } : {}),
    ...(dto.observationId === null ? {} : { observationId: optionalId(dto.observationId) }),
    ...(dto.inspectionId === null ? {} : { inspectionId: optionalId(dto.inspectionId) }),
  };
}

export function toHealthCase(dto: HealthCaseResponse): HealthCase {
  const followUps: FollowUpAction[] = dto.followUps.map((f) => ({ id: String(f.id), text: f.text, dueDate: f.dueDate, done: f.done }));
  return {
    id: dto.id,
    animalId: String(dto.animalId),
    finding: dto.finding,
    system: oneOf(SYSTEMS, dto.system, 'General'),
    status: oneOf(CASE_STATUSES, dto.status, 'open'),
    openedAt: toTime(dto.openedAt),
    updatedAt: toTime(dto.updatedAt),
    assigneeId: optionalId(dto.assigneeId) ?? null,
    followUps,
    events: dto.events.map(toEvent).sort((a, b) => a.at - b.at),
    evidence: dto.evidence.map((e) => ({
      id: String(e.id),
      kind: e.kind === 'video' ? 'video' : 'photo',
      ...(e.durationSec === null ? {} : { durationSec: Number(e.durationSec) }),
    })),
    closedAt: optionalTime(dto.closedAt),
    closeReason: dto.closeReason,
    reopenedAt: optionalTime(dto.reopenedAt),
  };
}

function toStaff(dto: StaffMemberResponse | null): StaffMember | null {
  return dto ? { id: String(dto.id), name: dto.name, role: oneOf(ROLES, dto.role, 'officer') } : null;
}

/** Keeps a case and its assignee in the store, so other screens (and the assignee list) see them. */
function remember(healthCase: HealthCase, assignee: StaffMember | null): void {
  const index = mockDb.cases.findIndex((c) => c.id === healthCase.id);
  if (index >= 0) mockDb.cases[index] = healthCase;
  else mockDb.cases.push(healthCase);
  if (assignee && !mockDb.staff.some((m) => m.id === assignee.id)) mockDb.staff.push(assignee);
}

export interface BackendCase {
  healthCase: HealthCase;
  animal: Animal;
  assignee: StaffMember | null;
}

function toBackendCase(dto: CaseListItemResponse | CaseDetailResponse): BackendCase {
  const backendCase = { healthCase: toHealthCase(dto.healthCase), animal: toAnimal(dto.animal), assignee: toStaff(dto.assignee) };
  remember(backendCase.healthCase, backendCase.assignee);
  return backendCase;
}

/** GET /cases. Replaces the store's cases of backend animals with the server's list. */
export async function listCases(): Promise<(BackendCase & { overdueFollowUps: number })[]> {
  const list = await unwrap(getApiV1Cases());
  mockDb.cases = mockDb.cases.filter((c) => !isBackendId(c.animalId));
  return list.map((dto) => ({ ...toBackendCase(dto), overdueFollowUps: Number(dto.overdueFollowUps) || 0 }));
}

export interface BackendCaseDetail extends BackendCase {
  summary: string;
  pendingObservationId: string | null;
}

function toDetail(dto: CaseDetailResponse): BackendCaseDetail {
  return {
    ...toBackendCase(dto),
    summary: dto.summary,
    pendingObservationId: dto.pendingObservationId === null ? null : String(dto.pendingObservationId),
  };
}

/** GET /cases/{caseId}. Throws ApiError (404 when there is no such case, 403 outside contractor scope). */
export async function getCase(caseId: string): Promise<BackendCaseDetail> {
  return toDetail(await unwrap(getApiV1CasesByCaseId({ path: { caseId } })));
}

/**
 * PATCH /cases/{caseId}. `followUps` replaces the whole list (null leaves it unchanged); existing items
 * keep their id, new ones are sent without. `assigneeId` null unassigns, so pass the current one to keep it.
 */
export async function patchCase(caseId: string, assigneeId: string | null, followUps: readonly (Omit<FollowUpAction, 'id'> & { id: string | null })[] | null): Promise<BackendCaseDetail> {
  const body: { assigneeId: string | null; followUps: FollowUpInput[] | null } = {
    assigneeId,
    followUps: followUps ? followUps.map((f) => ({ id: f.id, text: f.text, dueDate: f.dueDate, done: f.done })) : null,
  };
  return toDetail(await unwrap(patchApiV1CasesByCaseId({ path: { caseId }, body })));
}

/** POST /cases/{caseId}/close. 409 when it is already closed. */
export async function closeCase(caseId: string, reason: string, note: string): Promise<BackendCaseDetail> {
  return toDetail(await unwrap(postApiV1CasesByCaseIdClose({ path: { caseId }, body: { reason, note: note.trim() || null } })));
}

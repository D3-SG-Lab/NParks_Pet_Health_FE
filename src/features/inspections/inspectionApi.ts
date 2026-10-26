/**
 * Daily inspection (AM/PM) data access.
 *
 * MOCK: reads and writes the in-memory demo store. OUTSTANDING endpoints (BE-011): checks due per
 * session, create inspection (one AM and one PM per animal per day, edits audited), and the
 * "abnormal inspection" event that feeds AI routing. Offline capture with ordered sync (FE-018,
 * local SQLite) is also outstanding: records are saved straight to the mock store.
 */
import {
  describeInspectionFindings,
  inspectionClinicalSystems,
  isInspectionAbnormal,
} from '@/domain/describe';
import {
  INSPECTION_SYSTEMS,
  type Actor,
  type Animal,
  type FindingValue,
  type InspectionInput,
  type InspectionRecord,
  type InspectionSession,
  type InspectionSystem,
} from '@/domain/types';
import { analyseObservation } from '@/mock/ai';
import { mockDb, mockSigns, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { ScopeError, animalsInScope, canSeeAnimal } from '@/mock/scope';
import { queueIfOffline } from '@/mock/sync';
import { formatTime, isoDateOf } from '@/utils/dates';

export class InspectionError extends Error {
  readonly kind: 'already_recorded' | 'not_found';
  constructor(kind: InspectionError['kind'], message: string) {
    super(message);
    this.name = 'InspectionError';
    this.kind = kind;
  }
}

/** Everything defaults to Normal so a healthy animal takes a few taps (FE-009). */
export function createDefaultInspection(): InspectionInput {
  const systems = {} as Record<InspectionSystem, FindingValue>;
  for (const system of INSPECTION_SYSTEMS) systems[system] = 'normal';
  return { mentation: 'Responsive', systems, food: 'Full', stool: 'Firm', urine: 'Yes', otherFindings: '' };
}

export interface BoardItem {
  animal: Animal;
  record: InspectionRecord | null;
  /** Most recent inspection of any session, for "Last check: 08:12". */
  lastCheckAt: number | null;
  /** Open case, shown as "Dog · open case C-2026-0142". */
  openCaseId: string | null;
}

export interface InspectionBoard {
  date: string;
  session: InspectionSession;
  items: BoardItem[];
  doneCount: number;
}

/** Animals in scope with their inspection for the given day and session, in kennel order. */
export async function getInspectionBoard(actor: Actor, session: InspectionSession, now: number = Date.now()): Promise<InspectionBoard> {
  await simulateLatency();
  const date = isoDateOf(now);
  const items = animalsInScope(actor)
    .sort((a, b) => a.kennel.localeCompare(b.kennel, undefined, { numeric: true }))
    .map((animal) => {
      const records = mockDb.inspections.filter((i) => i.animalId === animal.id);
      return {
        animal,
        record: records.find((i) => i.date === date && i.session === session) ?? null,
        lastCheckAt: records.reduce<number | null>((latest, i) => Math.max(latest ?? 0, i.recordedAt), null),
        openCaseId: mockDb.cases.find((c) => c.animalId === animal.id && c.status !== 'closed')?.id ?? null,
      };
    });
  return overTheWire({ date, session, items, doneCount: items.filter((item) => item.record).length });
}

export interface SubmitInspectionInput {
  animalId: string;
  session: InspectionSession;
  input: InspectionInput;
  actor: Actor;
  now?: number;
}

export interface SubmitInspectionResult {
  record: InspectionRecord;
  /** Open case the abnormal findings were linked to. */
  linkedCaseId: string | null;
  /** True when abnormal findings were sent to the review queue for AI routing. */
  sentForReview: boolean;
}

export async function submitInspection({ animalId, session, input, actor, now = Date.now() }: SubmitInspectionInput): Promise<SubmitInspectionResult> {
  await simulateLatency();
  const animal = mockDb.animals.find((a) => a.id === animalId);
  if (!animal) throw new InspectionError('not_found', 'This animal is no longer under active monitoring.');
  if (!canSeeAnimal(actor, animal)) throw new ScopeError();
  const date = isoDateOf(now);
  const existing = mockDb.inspections.find((i) => i.animalId === animalId && i.date === date && i.session === session);
  if (existing) {
    throw new InspectionError('already_recorded', `The ${session} inspection for ${animal.name} was already recorded.`);
  }

  const record: InspectionRecord = {
    ...input,
    otherFindings: input.otherFindings.trim(),
    id: newMockId('insp'),
    animalId,
    date,
    session,
    recordedAt: now,
    recordedBy: actor.name,
  };
  mockDb.inspections.push(record);
  // Offline: saved on the device and sent in order later (FE-018). The screens still update now.
  queueIfOffline({
    kind: 'inspection',
    recordId: record.id,
    title: `${session} inspection · ${animal.kennel} ${animal.name}`,
    detail: `Saved ${formatTime(now)} on device`,
    savedAt: now,
  });
  if (session === 'AM') animal.today.amInspection = 'done';
  else animal.today.pmInspection = 'done';

  if (!isInspectionAbnormal(record)) return { record, linkedCaseId: null, sentForReview: false };

  // Abnormal items or free text publish an event for AI routing (BE-011). Mock rule: link to an
  // open case for the same body system, otherwise queue it for an officer to triage.
  const systems = inspectionClinicalSystems(record);
  const openCase = mockDb.cases.find((c) => c.animalId === animalId && c.status !== 'closed' && systems.includes(c.system));
  const findings = describeInspectionFindings(record);
  if (openCase) {
    openCase.events.push({
      id: newMockId('ev'),
      at: now,
      kind: 'inspection',
      title: `${session} inspection · ${findings}`,
      by: actor.name,
      inspectionId: record.id,
    });
    openCase.updatedAt = now;
    return { record, linkedCaseId: openCase.id, sentForReview: false };
  }

  const text = `${session} inspection of ${animal.kennel} ${animal.name}: ${findings}.${record.otherFindings ? ` ${record.otherFindings}` : ''}`;
  mockDb.observations.push({
    id: newMockId('obs'),
    animalId,
    text,
    media: [],
    submittedAt: now,
    submittedBy: actor.name,
    submittedByRole: actor.role,
    source: 'inspection',
    ai: analyseObservation({ text, chosenAnimalId: animalId, animals: mockDb.animals, cases: mockDb.cases, taxonomy: mockSigns, now }),
    status: 'review',
    routing: null,
    readyAt: null,
    aiUnavailable: false,
  });
  return { record, linkedCaseId: null, sentForReview: true };
}
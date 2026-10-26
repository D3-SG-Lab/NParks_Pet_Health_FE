/**
 * Animal picker, profile, health-record timeline and AI summary data access.
 *
 * MOCK: reads the in-memory demo store. OUTSTANDING endpoints: active animal list and search
 * (BE-009), the per-stay timeline feed (BE-020) and the 30-day AI summary with citations (AI-005).
 * The backend must also apply contractor kennel scoping (BE-005).
 */
import { SESSION_DUE_TIME, describeInspection, isInspectionAbnormal } from '@/domain/describe';
import {
  EXAM_SYSTEMS,
  type Actor,
  type Animal,
  type AnimalSummary,
  type ArrivalExamRecord,
  type HealthCase,
  type InspectionRecord,
  type InspectionSession,
  type MedicationAdministration,
  type MedicationSchedule,
  type Observation,
  type TimelineEntry,
} from '@/domain/types';
import { summariseAnimal } from '@/mock/ai';
import { mockDb, mockVets } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { resolvePendingAnalyses } from '@/mock/processing';
import { ScopeError, animalsInScope, canSeeAnimal } from '@/mock/scope';
import { isoDateOf, msAt, sessionFor } from '@/utils/dates';

/** Picker / list status, in the wireframe's words. */
export type AnimalListStatus = 'unwell' | 'due' | 'active';

export interface AnimalListItem {
  animal: Animal;
  /** Inspection status for the current session ("PM due" / "Done"). */
  session: InspectionSession;
  sessionDone: boolean;
  /** Has an open case. */
  unwell: boolean;
  status: AnimalListStatus;
}

function toListItem(animal: Animal, session: InspectionSession): AnimalListItem {
  const done = session === 'AM' ? animal.today.amInspection === 'done' : animal.today.pmInspection === 'done';
  const unwell = mockDb.cases.some((c) => c.animalId === animal.id && c.status !== 'closed');
  return { animal, session, sessionDone: done, unwell, status: unwell ? 'unwell' : done ? 'active' : 'due' };
}

/** Active animals the user may see, in kennel order. */
export async function listAnimals(actor: Actor, now: number = Date.now()): Promise<AnimalListItem[]> {
  await simulateLatency();
  const session = sessionFor(new Date(now));
  return overTheWire(animalsInScope(actor)
    .sort((a, b) => a.kennel.localeCompare(b.kennel, undefined, { numeric: true }))
    .map((animal) => toListItem(animal, session)));
}

export async function listRecentAnimalIds(): Promise<string[]> {
  await simulateLatency(0);
  return [...mockDb.recentAnimalIds];
}

/** Remembers a picked animal so it is offered first next time. */
export async function markAnimalRecent(animalId: string): Promise<void> {
  await simulateLatency(0);
  mockDb.recentAnimalIds = [animalId, ...mockDb.recentAnimalIds.filter((id) => id !== animalId)].slice(0, 3);
}

export type AnimalFilter = 'all' | 'due' | 'unwell';

/** Kennel code, name or microchip (spaces ignored), case-insensitive, plus the status filter. */
export function filterAnimals(items: readonly AnimalListItem[], query: string, filter: AnimalFilter = 'all'): AnimalListItem[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\s/g, '');
  return items.filter(({ animal, sessionDone, unwell }) => {
    if (filter === 'due' && sessionDone) return false;
    if (filter === 'unwell' && !unwell) return false;
    if (!q) return true;
    return animal.kennel.toLowerCase().includes(q) || animal.name.toLowerCase().includes(q) || (digits.length > 0 && /^\d+$/.test(digits) && animal.microchip.includes(digits));
  });
}

// --- Timeline -----------------------------------------------------------------------------------

function vetName(id: string | null): string {
  return mockVets.find((vet) => vet.id === id)?.name ?? 'Vet';
}

function examEntry(exam: ArrivalExamRecord): TimelineEntry {
  const abnormal = EXAM_SYSTEMS.some((system) => exam.findings[system].abnormal);
  return {
    id: exam.id,
    kind: 'exam',
    at: exam.examinedAt,
    session: null,
    title: 'Arrival exam',
    text: `Baseline recorded · ${vetName(exam.vetId)}${abnormal ? ' · abnormal findings noted' : ''}`,
    by: vetName(exam.vetId),
    media: EXAM_SYSTEMS.flatMap((system) => exam.findings[system].photos.map((p) => ({ id: p.id, kind: 'photo' as const }))),
    abnormal,
    caseId: null,
  };
}

function inspectionEntry(record: InspectionRecord, cases: readonly HealthCase[]): TimelineEntry {
  const linked = cases.find((c) => c.events.some((e) => e.inspectionId === record.id));
  const abnormal = isInspectionAbnormal(record);
  return {
    id: record.id,
    kind: 'inspection',
    at: record.recordedAt,
    session: record.session,
    title: `${record.session} inspection`,
    text: `${describeInspection(record)}${abnormal ? ' (abnormal)' : ''}`,
    by: record.recordedBy,
    media: [],
    abnormal,
    caseId: linked?.id ?? null,
  };
}

/** The animal an observation belongs to: the confirmed routing, the user's pick, or a confident AI match. */
export function observationAnimalId(observation: Observation): string | null {
  if (observation.routing) return observation.routing.animalId;
  if (observation.animalId) return observation.animalId;
  if (observation.status === 'awaiting-confirmation') return observation.ai?.match?.animalId ?? null;
  return null;
}

function observationEntry(observation: Observation): TimelineEntry {
  return {
    id: observation.id,
    kind: 'observation',
    at: observation.submittedAt,
    session: null,
    title: observation.source === 'inspection' ? 'Inspection finding' : 'Observation',
    text: observation.text,
    by: observation.submittedBy,
    media: observation.media,
    abnormal: (observation.ai?.extraction.signs.length ?? 0) > 0,
    caseId: observation.routing?.caseId ?? null,
  };
}

function medicationEntry(admin: MedicationAdministration, schedule: MedicationSchedule | undefined): TimelineEntry {
  const what = schedule ? `${schedule.item} ${schedule.dose}` : 'Medication';
  return {
    id: admin.id,
    kind: 'medication',
    at: admin.administeredAt,
    session: null,
    title: `${what} given`,
    text: `by ${admin.by}${admin.remarks ? ` · “${admin.remarks}”` : ''}`,
    by: admin.by,
    media: [],
    abnormal: false,
    caseId: null,
  };
}

function caseEntries(healthCase: HealthCase): TimelineEntry[] {
  return healthCase.events
    .filter((event) => event.kind === 'opened' || event.kind === 'closed' || event.kind === 'reopened' || (event.kind === 'observation' && event.title.includes('routed')))
    .map((event) => ({
      id: event.id,
      kind: 'case' as const,
      at: event.at,
      session: null,
      title:
        event.kind === 'opened'
          ? `Case ${healthCase.id} opened`
          : event.kind === 'closed'
            ? `Case ${healthCase.id} closed`
            : event.kind === 'reopened'
              ? `Case ${healthCase.id} reopened`
              : `Case ${healthCase.id} updated`,
      text:
        event.kind === 'closed'
          ? event.title.replace(/^Case closed · /, '')
          : event.kind === 'observation'
            ? `AI routing confirmed by ${event.by}`
            : event.kind === 'opened'
              ? `From AI routing · ${event.by}`
              : `${event.detail ?? 'Related signs'} · ${event.by}`,
      by: event.by,
      media: [],
      abnormal: false,
      caseId: healthCase.id,
    }));
}

/** One chronological feed per stay, newest first (BE-020). */
export function buildTimeline(animalId: string): TimelineEntry[] {
  const cases = mockDb.cases.filter((c) => c.animalId === animalId);
  const schedules = new Map(mockDb.schedules.map((s) => [s.id, s]));
  return [
    ...mockDb.exams.filter((e) => e.animalId === animalId).map(examEntry),
    ...mockDb.inspections.filter((i) => i.animalId === animalId).map((i) => inspectionEntry(i, cases)),
    ...mockDb.observations.filter((o) => observationAnimalId(o) === animalId).map(observationEntry),
    ...mockDb.administrations.filter((a) => a.animalId === animalId).map((a) => medicationEntry(a, schedules.get(a.scheduleId))),
    ...cases.flatMap(caseEntries),
  ].sort((a, b) => b.at - a.at);
}

export interface TodayCheck {
  status: 'done' | 'due';
  /** Done time or due time, HH:MM. */
  time: string | null;
  at: number | null;
}

export interface AnimalProfile {
  animal: Animal;
  timeline: TimelineEntry[];
  summary: AnimalSummary;
  cases: HealthCase[];
  openCases: HealthCase[];
  medicationCount: number;
  /** "Day 12 of 30": day of the stay and its length (null when there is no release date). */
  stayDay: number;
  stayLength: number | null;
  today: { arrivalExam: TodayCheck; am: TodayCheck; pm: TodayCheck };
}

const DAY_MS = 24 * 60 * 60_000;

export async function getAnimalProfile(actor: Actor, animalId: string, now: number = Date.now()): Promise<AnimalProfile | null> {
  await simulateLatency();
  resolvePendingAnalyses(now);
  const animal = mockDb.animals.find((a) => a.id === animalId);
  if (!animal) return null;
  if (!canSeeAnimal(actor, animal)) throw new ScopeError();
  const timeline = buildTimeline(animalId);
  const cases = mockDb.cases.filter((c) => c.animalId === animalId).sort((a, b) => b.updatedAt - a.updatedAt);
  const today = isoDateOf(now);
  const inspections = mockDb.inspections.filter((i) => i.animalId === animalId);
  const check = (session: InspectionSession): TodayCheck => {
    const record = inspections.find((i) => i.date === today && i.session === session);
    return record ? { status: 'done', time: null, at: record.recordedAt } : { status: 'due', time: SESSION_DUE_TIME[session], at: null };
  };
  const exam = mockDb.exams.find((e) => e.animalId === animalId);
  const arrival = msAt(animal.arrivalDate, '00:00');
  return overTheWire({
    animal,
    timeline,
    summary: summariseAnimal({
      entries: timeline,
      cases,
      inspections,
      schedules: mockDb.schedules.filter((s) => s.animalId === animalId),
      now,
    }),
    cases,
    openCases: cases.filter((c) => c.status !== 'closed'),
    medicationCount: mockDb.schedules.filter((s) => s.animalId === animalId && s.startDate <= today && s.endDate >= today).length,
    stayDay: Math.max(1, Math.floor((now - arrival) / DAY_MS) + 1),
    stayLength: animal.releaseDate ? Math.round((msAt(animal.releaseDate, '00:00') - arrival) / DAY_MS) : null,
    today: {
      arrivalExam: exam ? { status: 'done', time: null, at: exam.examinedAt } : { status: 'due', time: null, at: null },
      am: animal.today.amInspection === 'done' ? { ...check('AM'), status: 'done' } : check('AM'),
      pm: animal.today.pmInspection === 'done' ? { ...check('PM'), status: 'done' } : check('PM'),
    },
  });
}

// --- Record detail (citation / timeline tap) -----------------------------------------------------

export type RecordDetail =
  | { kind: 'inspection'; record: InspectionRecord }
  | { kind: 'observation'; record: Observation }
  | { kind: 'medication'; record: MedicationAdministration; schedule: MedicationSchedule | null }
  | { kind: 'exam'; record: ArrivalExamRecord; vet: string }
  | { kind: 'case'; caseId: string };

export async function getRecordDetail(entry: Pick<TimelineEntry, 'id' | 'kind' | 'caseId'>): Promise<RecordDetail | null> {
  await simulateLatency(150);
  switch (entry.kind) {
    case 'inspection': {
      const record = mockDb.inspections.find((i) => i.id === entry.id);
      return record ? { kind: 'inspection', record } : null;
    }
    case 'observation': {
      const record = mockDb.observations.find((o) => o.id === entry.id);
      return record ? { kind: 'observation', record } : null;
    }
    case 'medication': {
      const record = mockDb.administrations.find((a) => a.id === entry.id);
      return record
        ? { kind: 'medication', record, schedule: mockDb.schedules.find((s) => s.id === record.scheduleId) ?? null }
        : null;
    }
    case 'exam': {
      const record = mockDb.exams.find((e) => e.id === entry.id);
      return record ? { kind: 'exam', record, vet: vetName(record.vetId) } : null;
    }
    case 'case':
      return entry.caseId ? { kind: 'case', caseId: entry.caseId } : null;
  }
}
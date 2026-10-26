/**
 * Demo seed data. Used only by the in-memory mock store (src/mock/db.ts) so the app can be shown
 * without a backend. None of this is real; it is replaced by API responses later.
 *
 * Health records are generated relative to "now" (createSeedRecords) so the 30-day views, today's
 * checks and the medication due list always have something sensible to show.
 */
import {
  EXAM_SYSTEMS,
  INSPECTION_SYSTEMS,
  type AiResult,
  type Animal,
  type ArrivalExamRecord,
  type CaseEvent,
  type ClinicalSign,
  type Country,
  type ExamFinding,
  type ExamSystem,
  type FindingValue,
  type FoodLevel,
  type HealthCase,
  type InspectionRecord,
  type InspectionSession,
  type InspectionSystem,
  type Kennel,
  type MediaItem,
  type MedicationAdministration,
  type MedicationSchedule,
  type Observation,
  type OperationsAlert,
  type StaffMember,
  type StoolType,
  type Vet,
} from '@/domain/types';
import { addDaysIso, isoDateOf, isoToDdMm, msAt } from '@/utils/dates';

export const SEED_KENNELS: readonly Kennel[] = [
  { code: 'KC1-1', block: 'KC1' },
  { code: 'KC1-2', block: 'KC1' },
  { code: 'KC1-3', block: 'KC1' },
  { code: 'KC2-1', block: 'KC2' },
  { code: 'KC2-2', block: 'KC2' },
  { code: 'KC2-3', block: 'KC2' },
  { code: 'KC2-4', block: 'KC2' },
  { code: 'KC2-5', block: 'KC2' },
  { code: 'KC2-6', block: 'KC2' },
  { code: 'KC2-7', block: 'KC2' },
];

/** Kennels assigned to contractors (admin wireframe: "KC2-1 – KC2-6"). Contractors only see these. */
export const SEED_CONTRACTOR_KENNELS: readonly string[] = ['KC2-1', 'KC2-2', 'KC2-3', 'KC2-4', 'KC2-5', 'KC2-6'];

export const SEED_VETS: readonly Vet[] = [
  { id: 'vet-1', name: 'Dr. Priya Nair' },
  { id: 'vet-2', name: 'Dr. Daniel Tan' },
  { id: 'vet-3', name: 'Dr. Aisha Rahman' },
];

/** Staff who can be assigned cases or appear as the author of records. */
export const SEED_STAFF: readonly StaffMember[] = [
  { id: 'staff-1', name: 'Dr. Priya Nair', role: 'vet' },
  { id: 'staff-2', name: 'Dr. Daniel Tan', role: 'vet' },
  { id: 'staff-3', name: 'Aisha Rahman', role: 'officer' },
  { id: 'staff-4', name: 'Marcus Lim', role: 'supervisor' },
  { id: 'staff-5', name: 'Siti Hassan', role: 'contractor' },
];

export const SEED_COUNTRIES: readonly Country[] = [
  { code: 'AU', name: 'Australia' },
  { code: 'CN', name: 'China' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'JP', name: 'Japan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'TH', name: 'Thailand' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

/** AQC symptom taxonomy (subset). Owned by the backend master data later (BE-008). */
export const SEED_SIGNS: readonly ClinicalSign[] = [
  { code: 'soft-stool', label: 'Soft stool', system: 'GI' },
  { code: 'loose-stool', label: 'Loose stool', system: 'GI' },
  { code: 'vomiting', label: 'Vomiting', system: 'GI' },
  { code: 'reduced-appetite', label: 'Reduced appetite', system: 'GI' },
  { code: 'sneezing', label: 'Sneezing', system: 'Respiratory' },
  { code: 'nasal-discharge', label: 'Nasal discharge', system: 'Respiratory' },
  { code: 'coughing', label: 'Coughing', system: 'Respiratory' },
  { code: 'scratching', label: 'Scratching', system: 'Skin' },
  { code: 'hair-loss', label: 'Hair loss', system: 'Skin' },
  { code: 'eye-discharge', label: 'Eye discharge', system: 'Eyes' },
  { code: 'red-eye', label: 'Red eye', system: 'Eyes' },
  { code: 'ear-scratching', label: 'Ear scratching', system: 'Ears' },
  { code: 'head-shaking', label: 'Head shaking', system: 'Ears' },
  { code: 'lethargy', label: 'Lethargy', system: 'General' },
  { code: 'lameness', label: 'Lameness', system: 'Musculoskeletal' },
];

const DONE = { arrivalExam: 'done', amInspection: 'done', pmInspection: 'due' } as const;
const AM_DUE = { arrivalExam: 'done', amInspection: 'due', pmInspection: 'due' } as const;

export const SEED_ANIMALS: readonly Animal[] = [
  {
    id: 'animal-1',
    name: 'Biscuit',
    kennel: 'KC2-1',
    species: 'Dog',
    sex: 'Male',
    countryCode: 'AU',
    microchip: '982000123450001',
    dateOfBirth: '2022-03-14',
    arrivalDate: '2026-08-18',
    releaseDate: '2026-11-18',
    status: 'active-monitoring',
    today: DONE,
  },
  {
    id: 'animal-2',
    name: 'Yang Yang',
    kennel: 'KC2-2',
    species: 'Dog',
    sex: 'Female',
    countryCode: 'CN',
    microchip: '982000123450002',
    dateOfBirth: '2021-11-02',
    arrivalDate: '2026-08-19',
    releaseDate: '2026-11-19',
    status: 'active-monitoring',
    today: DONE,
  },
  {
    id: 'animal-3',
    name: 'Mochi',
    kennel: 'KC2-3',
    species: 'Cat',
    sex: 'Female',
    countryCode: 'JP',
    microchip: '982000123450003',
    dateOfBirth: '2023-01-27',
    arrivalDate: '2026-08-20',
    releaseDate: '2026-11-20',
    status: 'active-monitoring',
    today: AM_DUE,
  },
  {
    id: 'animal-4',
    name: 'Milo',
    kennel: 'KC2-4',
    species: 'Dog',
    sex: 'Male',
    countryCode: 'NZ',
    microchip: '982000123450004',
    dateOfBirth: '2020-07-09',
    arrivalDate: '2026-08-12',
    releaseDate: '2026-11-12',
    status: 'active-monitoring',
    today: DONE,
  },
  {
    id: 'animal-5',
    name: 'Luna',
    kennel: 'KC2-5',
    species: 'Cat',
    sex: 'Female',
    countryCode: 'GB',
    microchip: '982000123450005',
    dateOfBirth: '2022-09-30',
    arrivalDate: '2026-08-10',
    releaseDate: '2026-11-10',
    status: 'active-monitoring',
    today: AM_DUE,
  },
  {
    id: 'animal-6',
    name: 'Pepper',
    kennel: 'KC2-6',
    species: 'Dog',
    sex: 'Male',
    countryCode: 'US',
    microchip: '982000123450006',
    dateOfBirth: null,
    arrivalDate: '2026-08-22',
    releaseDate: null,
    status: 'active-monitoring',
    today: AM_DUE,
  },
  {
    id: 'animal-7',
    name: 'Simba',
    kennel: 'KC1-1',
    species: 'Cat',
    sex: 'Male',
    countryCode: 'TH',
    microchip: '982000123450007',
    dateOfBirth: '2024-02-11',
    arrivalDate: '2026-08-21',
    releaseDate: '2026-11-21',
    status: 'active-monitoring',
    today: DONE,
  },
  {
    id: 'animal-8',
    name: 'Kiwi',
    kennel: 'KC1-2',
    species: 'Other',
    sex: 'Unknown',
    countryCode: 'MY',
    microchip: '982000123450008',
    dateOfBirth: null,
    arrivalDate: '2026-08-23',
    releaseDate: null,
    status: 'active-monitoring',
    today: DONE,
  },
];

/** Seeded alerts; times are relative to "now" so they read "10 min ago" etc. */
function seedAlerts(now: number): OperationsAlert[] {
  return [
    {
      id: 'alert-1',
      animalId: 'animal-2',
      caseId: 'C-2026-0142',
      kind: 'review',
      message: 'GI observation requires review',
      at: now - 10 * 60_000,
    },
    {
      id: 'alert-3',
      animalId: 'animal-5',
      caseId: 'C-2026-0121',
      kind: 'open',
      message: 'Case reopened · sneezing, nasal discharge',
      at: now - 35 * 60_000,
    },
    {
      id: 'alert-2',
      animalId: 'animal-4',
      caseId: 'C-2026-0138',
      kind: 'open',
      message: 'Follow-up overdue · weigh Milo',
      at: now - 2 * 60 * 60_000,
    },
  ];
}

// --- Generated health records -------------------------------------------------------------------

export interface SeedRecords {
  alerts: OperationsAlert[];
  exams: ArrivalExamRecord[];
  inspections: InspectionRecord[];
  observations: Observation[];
  cases: HealthCase[];
  schedules: MedicationSchedule[];
  administrations: MedicationAdministration[];
}

const sign = (code: string): ClinicalSign => {
  const found = SEED_SIGNS.find((s) => s.code === code);
  if (!found) throw new Error(`Unknown seed sign ${code}`);
  return found;
};

const photo = (id: string): MediaItem => ({ id, kind: 'photo' });
const video = (id: string, durationSec: number): MediaItem => ({ id, kind: 'video', durationSec });

function normalSystems(): Record<InspectionSystem, FindingValue> {
  const systems = {} as Record<InspectionSystem, FindingValue>;
  for (const system of INSPECTION_SYSTEMS) systems[system] = 'normal';
  return systems;
}

function normalExamFindings(): Record<ExamSystem, ExamFinding> {
  const findings = {} as Record<ExamSystem, ExamFinding>;
  for (const system of EXAM_SYSTEMS) findings[system] = { abnormal: false, note: '', photos: [] };
  return findings;
}

/** Inspection deviations from "all normal", keyed by animal, days ago and session. */
interface InspectionTweak {
  food?: FoodLevel;
  stool?: StoolType;
  systems?: Partial<Record<InspectionSystem, FindingValue>>;
  otherFindings?: string;
}

const INSPECTION_TWEAKS: Record<string, InspectionTweak> = {
  'animal-2:5:AM': { stool: 'Soft', otherFindings: 'Soft stool in run' },
  'animal-2:4:AM': { stool: 'Loose', food: 'Half' },
  'animal-2:2:PM': { stool: 'Soft' },
  'animal-4:4:AM': { food: 'Little' },
  'animal-4:3:AM': { food: 'Half' },
  'animal-4:1:PM': { food: 'Half' },
  'animal-5:2:AM': { systems: { nose: 'abnormal' }, otherFindings: 'Clear nasal discharge' },
};

const INSPECTORS = ['Siti Hassan', 'Aisha Rahman'] as const;

function aiResult(
  animalId: string | null,
  confidence: number,
  signs: ClinicalSign[],
  action: AiResult['suggestion']['action'],
  caseId: string | null,
  rationale: string,
  onsetDate: string,
  processedAt: number,
  extra: { food?: FoodLevel; stool?: StoolType; candidates?: AiResult['candidates'] } = {},
): AiResult {
  return {
    match: animalId ? { animalId, confidence, selectedByUser: false } : null,
    candidates: extra.candidates ?? [],
    extraction: { signs, food: extra.food ?? null, stool: extra.stool ?? null, onsetDate, severity: 'mild' },
    suggestion: { action, caseId, rationale },
    processedAt,
    durationSec: 9,
  };
}

type SeedObservation = Omit<Observation, 'readyAt' | 'aiUnavailable'> & Partial<Pick<Observation, 'aiUnavailable'>>;

export function createSeedRecords(now: number = Date.now()): SeedRecords {
  const today = isoDateOf(now);
  const day = (daysAgo: number) => addDaysIso(today, -daysAgo);
  /** Time on a past day; today's times are clamped so nothing is in the future. */
  const at = (daysAgo: number, time: string) => {
    const ms = msAt(day(daysAgo), time);
    return daysAgo === 0 ? Math.min(ms, now - 5 * 60_000) : ms;
  };

  // Arrival exams (baseline) for every seeded animal.
  const exams: ArrivalExamRecord[] = SEED_ANIMALS.map((animal, index) => ({
    id: `exam-seed-${index + 1}`,
    animalId: animal.id,
    vetId: index % 2 === 0 ? 'vet-1' : 'vet-2',
    weightKg: animal.species === 'Cat' ? '4.1' : animal.species === 'Dog' ? '18.5' : '0.9',
    mentation: 'Responsive',
    findings: normalExamFindings(),
    examinedAt: msAt(animal.arrivalDate, '10:30'),
  }));

  // Daily inspections for the last 6 days, plus today's AM where the seed says it is done.
  const inspections: InspectionRecord[] = [];
  let inspectionCount = 0;
  const addInspection = (animal: Animal, daysAgo: number, session: InspectionSession) => {
    const tweak = INSPECTION_TWEAKS[`${animal.id}:${daysAgo}:${session}`] ?? {};
    inspectionCount += 1;
    inspections.push({
      id: `insp-seed-${inspectionCount}`,
      animalId: animal.id,
      date: day(daysAgo),
      session,
      mentation: 'Responsive',
      systems: { ...normalSystems(), ...tweak.systems },
      food: tweak.food ?? 'Full',
      stool: tweak.stool ?? 'Firm',
      urine: 'Yes',
      otherFindings: tweak.otherFindings ?? '',
      recordedAt: at(daysAgo, session === 'AM' ? `08:${String(10 + (inspectionCount % 40)).padStart(2, '0')}` : '16:20'),
      recordedBy: INSPECTORS[inspectionCount % INSPECTORS.length] ?? 'Siti Hassan',
    });
  };
  for (const animal of SEED_ANIMALS) {
    for (let daysAgo = 6; daysAgo >= 1; daysAgo -= 1) {
      addInspection(animal, daysAgo, 'AM');
      addInspection(animal, daysAgo, 'PM');
    }
    if (animal.today.amInspection === 'done') addInspection(animal, 0, 'AM');
  }
  const inspectionOf = (animalId: string, daysAgo: number, session: InspectionSession) =>
    inspections.find((i) => i.animalId === animalId && i.date === day(daysAgo) && i.session === session)?.id;

  // Observations: routed history, one awaiting confirmation, and three in the review queue.
  const seededObservations: SeedObservation[] = [
    {
      id: 'obs-101',
      animalId: null,
      text: 'KC2-2 Yang Yang — soft stool this morning, left half of breakfast.',
      media: [photo('media-1'), photo('media-2')],
      submittedAt: at(6, '09:40'),
      submittedBy: 'Aisha Rahman',
      submittedByRole: 'officer',
      source: 'observation',
      ai: aiResult('animal-2', 0.96, [sign('soft-stool'), sign('reduced-appetite')], 'new-case', null, 'New GI signs with no open case.', day(6), at(6, '09:41'), { food: 'Half', stool: 'Soft' }),
      status: 'routed',
      routing: { action: 'new-case', animalId: 'animal-2', caseId: 'C-2026-0142', confirmedBy: 'Aisha Rahman', confirmedAt: at(6, '09:45') },
    },
    {
      id: 'obs-102',
      animalId: 'animal-2',
      text: 'Yang Yang had loose stool again after lunch, otherwise bright and alert.',
      media: [],
      submittedAt: at(4, '14:10'),
      submittedBy: 'Siti Hassan',
      submittedByRole: 'contractor',
      source: 'observation',
      ai: aiResult('animal-2', 1, [sign('loose-stool')], 'update-case', 'C-2026-0142', `Signs match open GI case opened ${isoToDdMm(day(6))}.`, day(4), at(4, '14:11'), { stool: 'Loose' }),
      status: 'routed',
      routing: { action: 'update-case', animalId: 'animal-2', caseId: 'C-2026-0142', confirmedBy: 'Aisha Rahman', confirmedAt: at(4, '14:30') },
    },
    {
      id: 'obs-103',
      animalId: null,
      text: 'KC2-2 vomited once after dinner and only ate half her food.',
      media: [video('media-3', 12), photo('media-4')],
      submittedAt: at(2, '18:20'),
      submittedBy: 'Aisha Rahman',
      submittedByRole: 'officer',
      source: 'observation',
      ai: aiResult('animal-2', 0.93, [sign('vomiting'), sign('reduced-appetite')], 'update-case', 'C-2026-0142', 'Signs match the open GI case.', day(2), at(2, '18:21'), { food: 'Half' }),
      status: 'routed',
      routing: { action: 'update-case', animalId: 'animal-2', caseId: 'C-2026-0142', confirmedBy: 'Aisha Rahman', confirmedAt: at(2, '18:30') },
    },
    {
      id: 'obs-104',
      animalId: null,
      text: 'KC2-2 Yang Yang soft stool this morning, but eating well and active.',
      media: [photo('media-5')],
      submittedAt: at(0, '07:35'),
      submittedBy: 'Siti Hassan',
      submittedByRole: 'contractor',
      source: 'observation',
      ai: aiResult('animal-2', 0.94, [sign('soft-stool')], 'update-case', 'C-2026-0142', 'Signs match the open GI case.', day(0), at(0, '07:36'), { stool: 'Soft', food: 'Full' }),
      status: 'awaiting-confirmation',
      routing: null,
    },
    {
      id: 'obs-201',
      animalId: 'animal-4',
      text: 'KC2-4 Milo only ate a little of his breakfast and left the rest.',
      media: [],
      submittedAt: at(5, '09:05'),
      submittedBy: 'Siti Hassan',
      submittedByRole: 'contractor',
      source: 'observation',
      ai: aiResult('animal-4', 1, [sign('reduced-appetite')], 'new-case', null, 'New GI signs with no open case.', day(5), at(5, '09:06'), { food: 'Little' }),
      status: 'routed',
      routing: { action: 'new-case', animalId: 'animal-4', caseId: 'C-2026-0138', confirmedBy: 'Aisha Rahman', confirmedAt: at(5, '09:20') },
    },
    {
      id: 'obs-301',
      animalId: null,
      text: 'Luna in KC2-5 is sneezing again, with clear nasal discharge.',
      media: [photo('media-6')],
      submittedAt: at(2, '10:15'),
      submittedBy: 'Aisha Rahman',
      submittedByRole: 'officer',
      source: 'observation',
      ai: aiResult('animal-5', 0.95, [sign('sneezing'), sign('nasal-discharge')], 'reopen-case', 'C-2026-0121', 'Related signs within 30 days of closed case C-2026-0121.', day(2), at(2, '10:16')),
      status: 'routed',
      routing: { action: 'reopen-case', animalId: 'animal-5', caseId: 'C-2026-0121', confirmedBy: 'Aisha Rahman', confirmedAt: at(2, '10:25') },
    },
    // Review queue (wireframe: no match, then two low-confidence guesses).
    {
      id: 'obs-401',
      animalId: null,
      text: 'Dog in the end kennel keeps scratching its left ear and shaking its head.',
      media: [photo('media-7'), photo('media-8')],
      submittedAt: at(0, '07:55'),
      submittedBy: 'Aisha Rahman',
      submittedByRole: 'officer',
      source: 'observation',
      ai: aiResult(null, 0, [sign('ear-scratching'), sign('head-shaking')], 'new-case', null, 'No kennel code or name recognised.', day(0), at(0, '07:56'), { candidates: [{ animalId: 'animal-4', confidence: 0.48 }, { animalId: 'animal-6', confidence: 0.31 }] }),
      status: 'review',
      routing: null,
    },
    {
      id: 'obs-402',
      animalId: null,
      text: "The brown dog didn't finish breakfast again.",
      media: [],
      submittedAt: at(0, '09:20'),
      submittedBy: 'Aisha Rahman',
      submittedByRole: 'officer',
      source: 'observation',
      ai: aiResult('animal-4', 0.58, [sign('reduced-appetite')], 'update-case', 'C-2026-0138', 'Possible match on species and recent appetite case.', day(0), at(0, '09:21'), { food: 'Half' }),
      status: 'review',
      routing: null,
    },
    {
      id: 'obs-403',
      animalId: null,
      text: 'Pepper? Coughing a few times this morning during cleaning.',
      media: [photo('media-9'), photo('media-10')],
      submittedAt: at(0, '10:05'),
      submittedBy: 'Siti Hassan',
      submittedByRole: 'contractor',
      source: 'observation',
      ai: aiResult('animal-6', 0.61, [sign('coughing')], 'new-case', null, 'Name matched with low certainty.', day(0), at(0, '10:06')),
      status: 'review',
      routing: null,
    },
    {
      id: 'obs-404',
      animalId: null,
      text: 'KC1-2 vomited once after PM feed, photo attached.',
      media: [photo('media-11')],
      submittedAt: at(1, '17:30'),
      submittedBy: 'Siti Hassan',
      submittedByRole: 'contractor',
      source: 'observation',
      ai: null,
      aiUnavailable: true,
      status: 'review',
      routing: null,
    },
  ];
  const observations: Observation[] = seededObservations.map((o) => ({ ...o, readyAt: null, aiUnavailable: o.aiUnavailable ?? false }));

  const event = (id: string, at_: number, kind: CaseEvent['kind'], title: string, by: string, extra: Partial<CaseEvent> = {}): CaseEvent => ({
    id,
    at: at_,
    kind,
    title,
    by,
    ...extra,
  });

  const cases: HealthCase[] = [
    {
      id: 'C-2026-0142',
      animalId: 'animal-2',
      finding: 'GI upset — soft stool, reduced appetite',
      system: 'GI',
      status: 'review',
      openedAt: at(6, '09:45'),
      updatedAt: at(0, '07:36'),
      assigneeId: 'staff-1',
      followUps: [
        { id: 'fu-1', text: 'Collect stool sample', dueDate: day(3), done: true },
        { id: 'fu-2', text: 'Recheck hydration', dueDate: day(1), done: false },
        { id: 'fu-3', text: 'Vet review of diet', dueDate: day(-1), done: false },
      ],
      events: [
        event('ev-1', at(6, '09:45'), 'opened', 'Case opened from AI routing', 'Aisha Rahman', { observationId: 'obs-101', detail: 'Confirmed by Aisha Rahman' }),
        event('ev-2', at(6, '10:30'), 'assigned', 'Assigned to Dr. Priya Nair', 'Marcus Lim'),
        event('ev-3', at(4, '08:15'), 'inspection', 'AM inspection · Stool: Loose', 'Siti Hassan', { inspectionId: inspectionOf('animal-2', 4, 'AM') }),
        event('ev-4', at(4, '14:30'), 'observation', 'Observation routed by AI · update case', 'Aisha Rahman', { observationId: 'obs-102', detail: 'Loose stool again after lunch' }),
        event('ev-5', at(2, '18:30'), 'observation', 'Observation routed by AI · update case', 'Aisha Rahman', { observationId: 'obs-103', detail: 'Vomited once after dinner' }),
        event('ev-6', at(0, '07:36'), 'observation', 'New observation needs review', 'AI', { observationId: 'obs-104', detail: 'Soft stool this morning' }),
      ],
      evidence: [photo('media-1'), photo('media-2'), video('media-3', 12), photo('media-4'), photo('media-5')],
      closedAt: null,
      closeReason: null,
      reopenedAt: null,
    },
    {
      id: 'C-2026-0138',
      animalId: 'animal-4',
      finding: 'Reduced appetite, leaving food',
      system: 'GI',
      status: 'open',
      openedAt: at(5, '09:20'),
      updatedAt: at(1, '16:20'),
      assigneeId: 'staff-3',
      followUps: [
        { id: 'fu-4', text: 'Weigh Milo', dueDate: day(1), done: false },
        { id: 'fu-5', text: 'Offer a bland diet', dueDate: day(-1), done: false },
      ],
      events: [
        event('ev-7', at(5, '09:20'), 'opened', 'Case opened from AI routing', 'Aisha Rahman', { observationId: 'obs-201', detail: 'Confirmed by Aisha Rahman' }),
        event('ev-8', at(5, '09:25'), 'assigned', 'Assigned to Aisha Rahman', 'Marcus Lim'),
        event('ev-9', at(3, '08:20'), 'inspection', 'AM inspection · Food: Half', 'Siti Hassan', { inspectionId: inspectionOf('animal-4', 3, 'AM') }),
        event('ev-10', at(1, '16:20'), 'inspection', 'PM inspection · Food: Half', 'Aisha Rahman', { inspectionId: inspectionOf('animal-4', 1, 'PM') }),
      ],
      evidence: [],
      closedAt: null,
      closeReason: null,
      reopenedAt: null,
    },
    {
      id: 'C-2026-0121',
      animalId: 'animal-5',
      finding: 'Sneezing, clear nasal discharge',
      system: 'Respiratory',
      status: 'open',
      openedAt: at(16, '11:00'),
      updatedAt: at(2, '10:25'),
      assigneeId: 'staff-2',
      followUps: [{ id: 'fu-6', text: 'Nebulise twice daily', dueDate: day(-3), done: false }],
      events: [
        event('ev-11', at(16, '11:00'), 'opened', 'Case opened from AI routing', 'Aisha Rahman', { detail: 'Confirmed by Aisha Rahman' }),
        event('ev-12', at(16, '11:30'), 'assigned', 'Assigned to Dr. Daniel Tan', 'Marcus Lim'),
        event('ev-13', at(9, '15:00'), 'closed', 'Case closed · Resolved', 'Dr. Daniel Tan', { detail: 'No signs for 5 days' }),
        event('ev-14', at(2, '10:25'), 'reopened', 'Case reopened · related signs', 'Aisha Rahman', { observationId: 'obs-301', detail: 'Sneezing again with nasal discharge' }),
      ],
      evidence: [photo('media-6')],
      closedAt: null,
      closeReason: null,
      reopenedAt: at(2, '10:25'),
    },
    {
      id: 'C-2026-0107',
      animalId: 'animal-1',
      finding: 'Skin irritation — resolved',
      system: 'Skin',
      status: 'closed',
      openedAt: at(20, '09:00'),
      updatedAt: at(8, '14:00'),
      assigneeId: 'staff-1',
      followUps: [{ id: 'fu-7', text: 'Medicated shampoo for 10 days', dueDate: day(10), done: true }],
      events: [
        event('ev-15', at(20, '09:00'), 'opened', 'Case opened from AI routing', 'Aisha Rahman'),
        event('ev-16', at(20, '09:30'), 'assigned', 'Assigned to Dr. Priya Nair', 'Marcus Lim'),
        event('ev-17', at(8, '14:00'), 'closed', 'Case closed · Resolved after treatment', 'Dr. Priya Nair'),
      ],
      evidence: [],
      closedAt: at(8, '14:00'),
      closeReason: 'Resolved after treatment',
      reopenedAt: null,
    },
    {
      id: 'C-2026-0099',
      animalId: 'animal-7',
      finding: 'Eye discharge — resolved',
      system: 'Eyes',
      status: 'closed',
      openedAt: at(18, '10:00'),
      updatedAt: at(12, '11:00'),
      assigneeId: 'staff-2',
      followUps: [],
      events: [
        event('ev-18', at(18, '10:00'), 'opened', 'Case opened from AI routing', 'Siti Hassan'),
        event('ev-19', at(12, '11:00'), 'closed', 'Case closed · Resolved', 'Dr. Daniel Tan'),
      ],
      evidence: [],
      closedAt: at(12, '11:00'),
      closeReason: 'Resolved',
      reopenedAt: null,
    },
  ];

  const schedules: MedicationSchedule[] = [
    { id: 'med-1', animalId: 'animal-2', item: 'Probiotic', dose: '5 mL oral', times: ['08:00', '20:00'], startDate: day(5), endDate: day(-5) },
    { id: 'med-2', animalId: 'animal-2', item: 'Ear drops', dose: '2 drops, left ear', times: ['09:00'], startDate: day(5), endDate: day(-3) },
    { id: 'med-5', animalId: 'animal-2', item: 'Omega-3', dose: '1 capsule', times: ['07:30'], startDate: day(10), endDate: day(-10) },
    { id: 'med-3', animalId: 'animal-4', item: 'Appetite stimulant', dose: '1 tablet', times: ['09:00'], startDate: day(3), endDate: day(-4) },
    { id: 'med-4', animalId: 'animal-5', item: 'Saline nebulisation', dose: '10 min', times: ['10:00', '16:00'], startDate: day(2), endDate: day(-5) },
  ];

  // Every past dose was given. Today: Omega-3 and the probiotic's 08:00 dose (if their time has passed);
  // the ear drops are left undone so they show as overdue.
  const administrations: MedicationAdministration[] = [];
  for (const schedule of schedules) {
    for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
      const date = day(daysAgo);
      if (date < schedule.startDate || date > schedule.endDate) continue;
      for (const time of schedule.times) {
        const due = msAt(date, time);
        const isToday = daysAgo === 0;
        if (isToday && !((schedule.id === 'med-1' && time === '08:00') || schedule.id === 'med-5')) continue;
        if (due + 10 * 60_000 > now) continue;
        administrations.push({
          id: `adm-seed-${administrations.length + 1}`,
          scheduleId: schedule.id,
          animalId: schedule.animalId,
          slot: `${date}T${time}`,
          administeredAt: due + 10 * 60_000,
          by: isToday ? 'Aisha Rahman' : (INSPECTORS[administrations.length % 2] ?? 'Aisha Rahman'),
          remarks: schedule.item === 'Probiotic' ? 'Mixed with food' : '',
        });
      }
    }
  }

  return { alerts: seedAlerts(now), exams, inspections, observations, cases, schedules, administrations };
}
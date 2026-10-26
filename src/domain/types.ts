/**
 * Domain types shared by the mobile app features.
 *
 * These are hand-written placeholders. Replace them with the types generated from the backend
 * OpenAPI spec (BE-001) once it exists; the feature API layers are the only code that should change.
 */

export const SPECIES = ['Dog', 'Cat', 'Other'] as const;
export type Species = (typeof SPECIES)[number];

export const SEXES = ['Male', 'Female', 'Unknown'] as const;
export type Sex = (typeof SEXES)[number];

export const MENTATIONS = ['Responsive', 'Calm', 'Active', 'Alert'] as const;
export type Mentation = (typeof MENTATIONS)[number];

/** Physical exam systems, in wireframe 03 order. */
export const EXAM_SYSTEMS = ['skin', 'eyes', 'nose', 'ears', 'mouth', 'hydration', 'respiratory'] as const;
export type ExamSystem = (typeof EXAM_SYSTEMS)[number];

export const EXAM_SYSTEM_LABELS: Record<ExamSystem, string> = {
  skin: 'Skin / coat',
  eyes: 'Eyes',
  nose: 'Nose',
  ears: 'Ears',
  mouth: 'Mouth',
  hydration: 'Hydration',
  respiratory: 'Respiratory',
};

export type CheckStatus = 'done' | 'due';
export type AnimalStatus = 'active-monitoring';
export type CaseStatus = 'review' | 'open' | 'closed';

export interface Kennel {
  code: string;
  block: string;
}

export interface Vet {
  id: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface TodayStatus {
  arrivalExam: CheckStatus;
  amInspection: CheckStatus;
  pmInspection: CheckStatus;
}

export interface Animal {
  id: string;
  name: string;
  kennel: string;
  species: Species;
  sex: Sex;
  countryCode: string;
  /** 15-digit microchip number. Unique across active stays. */
  microchip: string;
  /** ISO date (YYYY-MM-DD) or null when unknown. */
  dateOfBirth: string | null;
  arrivalDate: string;
  releaseDate: string | null;
  status: AnimalStatus;
  today: TodayStatus;
}

/** Staff roles known to the app. Officer-side roles share the officer identity provider. */
export type StaffRole = 'officer' | 'vet' | 'supervisor' | 'contractor';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

/** Who performed an action. Captured automatically from the session, never typed by the user. */
export interface Actor {
  id: string;
  name: string;
  role: 'officer' | 'contractor';
}

// --- Clinical signs (AQC symptom taxonomy) -------------------------------------------------------

export type ClinicalSystem = 'GI' | 'Respiratory' | 'Skin' | 'Eyes' | 'Ears' | 'General' | 'Musculoskeletal';

export interface ClinicalSign {
  code: string;
  label: string;
  system: ClinicalSystem;
}

export type Severity = 'mild' | 'moderate' | 'severe';

// --- Media ---------------------------------------------------------------------------------------

export type MediaKind = 'photo' | 'video';

/** Evidence attached to an observation, inspection or case. Mock placeholders until FE-011 / BE-013. */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  /** Video length in seconds. */
  durationSec?: number;
}

// --- Daily inspection (wireframe 04) -------------------------------------------------------------

export const INSPECTION_SESSIONS = ['AM', 'PM'] as const;
export type InspectionSession = (typeof INSPECTION_SESSIONS)[number];

/** Daily inspection body systems, in wireframe 04 order. */
export const INSPECTION_SYSTEMS = ['skin', 'eyes', 'nose', 'ears', 'mouth', 'hydration', 'cardiorespiratory'] as const;
export type InspectionSystem = (typeof INSPECTION_SYSTEMS)[number];

export const INSPECTION_SYSTEM_LABELS: Record<InspectionSystem, string> = {
  skin: 'Skin / coat',
  eyes: 'Eyes',
  nose: 'Nose',
  ears: 'Ears',
  mouth: 'Mouth',
  hydration: 'Hydration',
  cardiorespiratory: 'Cardiorespiratory',
};

export const FOOD_LEVELS = ['Full', 'Half', 'Little', 'None'] as const;
export type FoodLevel = (typeof FOOD_LEVELS)[number];

export const STOOL_TYPES = ['Firm', 'Soft', 'Loose', 'Watery', 'None'] as const;
export type StoolType = (typeof STOOL_TYPES)[number];

export const URINE_VALUES = ['Yes', 'No'] as const;
export type UrineValue = (typeof URINE_VALUES)[number];

export type FindingValue = 'normal' | 'abnormal';

export interface InspectionInput {
  mentation: Mentation;
  systems: Record<InspectionSystem, FindingValue>;
  food: FoodLevel;
  stool: StoolType;
  urine: UrineValue;
  otherFindings: string;
}

export interface InspectionRecord extends InspectionInput {
  id: string;
  animalId: string;
  /** Calendar day of the session, ISO YYYY-MM-DD. */
  date: string;
  session: InspectionSession;
  recordedAt: number;
  recordedBy: string;
}

// --- Observations and AI routing (wireframes 05, 06, review queue) -------------------------------

export type RoutingAction = 'timeline-only' | 'update-case' | 'new-case' | 'reopen-case';

export interface AiExtraction {
  signs: ClinicalSign[];
  food: FoodLevel | null;
  stool: StoolType | null;
  /** ISO date. */
  onsetDate: string;
  severity: Severity;
}

export interface AiMatch {
  animalId: string;
  /** 0..1. */
  confidence: number;
  /** True when the user picked the animal before submitting (no AI guess needed). */
  selectedByUser: boolean;
}

export interface AiResult {
  match: AiMatch | null;
  /** Other possible animals, best first (shown when there is no confident match). */
  candidates: { animalId: string; confidence: number }[];
  extraction: AiExtraction;
  suggestion: { action: RoutingAction; caseId: string | null; rationale: string };
  processedAt: number;
  /** How long the analysis took, for "AI analysis ready · 9 s". */
  durationSec: number;
}

/**
 * processing: AI still working. awaiting-confirmation: confident result, waiting for the user.
 * review: unmatched or below the confidence threshold, waiting in the review queue. routed: done.
 */
export type ObservationStatus = 'processing' | 'awaiting-confirmation' | 'review' | 'routed';

export interface ObservationRouting {
  action: RoutingAction;
  animalId: string;
  caseId: string | null;
  confirmedBy: string;
  confirmedAt: number;
}

export interface Observation {
  id: string;
  /** Animal chosen by the user, or null to let the AI match it. */
  animalId: string | null;
  text: string;
  media: MediaItem[];
  submittedAt: number;
  submittedBy: string;
  submittedByRole: Actor['role'];
  /** Where it came from: an ad-hoc observation or abnormal daily inspection items. */
  source: 'observation' | 'inspection';
  ai: AiResult | null;
  status: ObservationStatus;
  routing: ObservationRouting | null;
  /**
   * While processing: when the AI result will be ready (epoch ms), or null while the observation is
   * still on the device waiting to sync.
   */
  readyAt: number | null;
  /** The AI service could not process it; it waits in the review queue for manual routing. */
  aiUnavailable: boolean;
}

// --- Health cases (wireframe 09) -----------------------------------------------------------------

export interface FollowUpAction {
  id: string;
  text: string;
  /** ISO date. */
  dueDate: string;
  done: boolean;
}

export type CaseEventKind = 'opened' | 'observation' | 'inspection' | 'assigned' | 'note' | 'reviewed' | 'closed' | 'reopened' | 'follow-up';

export interface CaseEvent {
  id: string;
  at: number;
  kind: CaseEventKind;
  title: string;
  by: string;
  detail?: string;
  observationId?: string;
  inspectionId?: string;
}

export interface HealthCase {
  id: string;
  animalId: string;
  finding: string;
  system: ClinicalSystem;
  status: CaseStatus;
  openedAt: number;
  updatedAt: number;
  assigneeId: string | null;
  followUps: FollowUpAction[];
  /** Full history, including everything from before a reopen. Oldest first. */
  events: CaseEvent[];
  evidence: MediaItem[];
  closedAt: number | null;
  closeReason: string | null;
  reopenedAt: number | null;
}

// --- Medication (wireframe 07) -------------------------------------------------------------------

export interface MedicationSchedule {
  id: string;
  animalId: string;
  item: string;
  dose: string;
  /** Dose times each day, HH:MM. */
  times: string[];
  /** ISO dates, inclusive. */
  startDate: string;
  endDate: string;
}

export interface MedicationAdministration {
  id: string;
  scheduleId: string;
  animalId: string;
  /** The scheduled dose this records, `YYYY-MM-DDTHH:MM`. One administration per slot. */
  slot: string;
  administeredAt: number;
  by: string;
  remarks: string;
}

export type DoseStatus = 'upcoming' | 'due' | 'overdue' | 'administered';

export interface DoseSlot {
  slot: string;
  scheduleId: string;
  item: string;
  dose: string;
  /** e.g. "2x daily". */
  frequency: string;
  startDate: string;
  endDate: string;
  /** HH:MM. */
  time: string;
  status: DoseStatus;
  administration: MedicationAdministration | null;
}

// --- Animal profile (wireframe 08) ---------------------------------------------------------------

export type TimelineKind = 'inspection' | 'observation' | 'medication' | 'case' | 'exam';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  at: number;
  /** e.g. "AM" for inspections. */
  session: InspectionSession | null;
  /** Headline, e.g. "AM inspection", "Probiotic 5 mL given", "Case C-2026-0142 updated". */
  title: string;
  /** Detail line under the title. */
  text: string;
  by: string;
  media: MediaItem[];
  abnormal: boolean;
  /** The case this entry belongs to or opened, if any. */
  caseId: string | null;
}

export interface SummaryCitation {
  /** Timeline entry ID, or the case ID for case citations. */
  id: string;
  label: string;
  kind: TimelineKind;
}

/** One AI statement with numbered citations into `sources` ("GI upset since 14/10 … [1] [2]"). */
export interface SummaryStatement {
  text: string;
  /** 1-based indexes into AnimalSummary.sources. */
  refs: number[];
}

export interface AnimalSummary {
  statements: SummaryStatement[];
  sources: SummaryCitation[];
  updatedAt: number;
}

/** review: AI result to confirm. open: case activity (e.g. reopened). overdue: a check not done in time. */
export type AlertKind = 'review' | 'open' | 'overdue';

export interface OperationsAlert {
  id: string;
  animalId: string;
  /** Case the alert opens; null for overdue inspections (they open the inspection). */
  caseId: string | null;
  kind: AlertKind;
  message: string;
  /** When it was raised (epoch ms). */
  at: number;
  /** Secondary line instead of the relative time, e.g. "Due 08:00". */
  meta?: string;
}

// --- Offline capture (FE-018) --------------------------------------------------------------------

export type SyncKind = 'inspection' | 'observation' | 'medication';
export type SyncStatus = 'waiting' | 'uploading' | 'failed';

/** A record saved on the device while offline, waiting to be sent in order. */
export interface SyncItem {
  id: string;
  kind: SyncKind;
  /** The record it carries (inspection / observation / administration ID). */
  recordId: string;
  /** "AM inspection · KC2-3 Lucky". */
  title: string;
  /** "Probiotic 5 mL", "2 photos". */
  detail: string;
  savedAt: number;
  status: SyncStatus;
  /** 0..1 while uploading. */
  progress: number;
}

export interface SyncState {
  online: boolean;
  items: SyncItem[];
  /** True while items are being sent. */
  syncing: boolean;
}

// --- Notifications (FE-019) ----------------------------------------------------------------------

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: number;
  /** Where tapping it goes. */
  target: { kind: 'case'; caseId: string } | { kind: 'animal'; animalId: string };
}

/** Mock attachment shown as a placeholder tile. Real uploads follow FE-011 (SAS URL upload). */
export interface ExamPhoto {
  id: string;
}

export interface ExamFinding {
  abnormal: boolean;
  note: string;
  photos: ExamPhoto[];
}

export interface ArrivalExamInput {
  vetId: string | null;
  /** Raw text as typed, validated on submit. */
  weightKg: string;
  mentation: Mentation;
  findings: Record<ExamSystem, ExamFinding>;
}

export interface ArrivalDetailsInput {
  name: string;
  kennel: string | null;
  species: Species;
  countryCode: string | null;
  microchip: string;
  sex: Sex | null;
  /** DD/MM/YYYY as typed. */
  dateOfBirth: string;
  releaseDate: string;
}

export interface ArrivalDraft {
  details: ArrivalDetailsInput;
  exam: ArrivalExamInput | null;
  updatedAt: number;
}

export interface ArrivalExamRecord extends ArrivalExamInput {
  id: string;
  animalId: string;
  examinedAt: number;
}

export interface OperationsSummary {
  activePets: number;
  /** Checks still due in the current session. */
  checksDue: number;
  session: InspectionSession;
  openCases: number;
  observationsNeedingReview: number;
  alerts: (OperationsAlert & { animalName: string; kennel: string })[];
  updatedAt: number;
}

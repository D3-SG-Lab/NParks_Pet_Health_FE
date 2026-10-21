/**
 * Domain types shared by the Operations and Arrival flows.
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

export interface HealthCase {
  id: string;
  animalId: string;
  finding: string;
  status: CaseStatus;
}

export type AlertKind = 'review' | 'open';

export interface OperationsAlert {
  id: string;
  animalId: string;
  caseId: string;
  kind: AlertKind;
  message: string;
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
  checksDueAm: number;
  openCases: number;
  observationsNeedingReview: number;
  alerts: (OperationsAlert & { animalName: string; kennel: string })[];
}

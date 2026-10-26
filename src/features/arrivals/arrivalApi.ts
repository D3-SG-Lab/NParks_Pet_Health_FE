/**
 * Arrival (New Arrival + Arrival Exam) data access.
 *
 * MOCK: every function below reads and writes the in-memory demo store, not a backend. Nothing is
 * transmitted or persisted. OUTSTANDING endpoints to replace these once they are in the OpenAPI
 * spec (BE-001 and related): draft save/load, kennel/vet/country lookups, microchip uniqueness
 * check, and "complete arrival exam" (creates the animal stay and baseline exam in one call).
 * The backend must also enforce microchip uniqueness and that only officers can create arrivals.
 */
import type {
  Animal,
  ArrivalDetailsInput,
  ArrivalDraft,
  ArrivalExamInput,
  ArrivalExamRecord,
  Country,
  ExamPhoto,
  Vet,
} from '@/domain/types';
import { mockCountries, mockDb, mockKennels, mockVets, newMockId } from '@/mock/db';
import { simulateLatency } from '@/mock/latency';
import { parseDdMmYyyy, todayIso } from '@/utils/dates';

import { EMPTY_DETAILS } from './validation';

export type ArrivalErrorKind = 'microchip_taken' | 'incomplete';

export class ArrivalError extends Error {
  readonly kind: ArrivalErrorKind;
  constructor(kind: ArrivalErrorKind, message: string) {
    super(message);
    this.name = 'ArrivalError';
    this.kind = kind;
  }
}

export interface KennelOption {
  code: string;
  block: string;
  /** Name of the animal currently in this kennel, for information only. */
  occupant: string | null;
}

export async function listKennelOptions(): Promise<KennelOption[]> {
  await simulateLatency();
  return mockKennels.map((kennel) => ({
    ...kennel,
    occupant: mockDb.animals.find((animal) => animal.kennel === kennel.code)?.name ?? null,
  }));
}

export async function listVets(): Promise<Vet[]> {
  await simulateLatency();
  return [...mockVets];
}

export async function listCountries(): Promise<Country[]> {
  await simulateLatency();
  return [...mockCountries];
}

/**
 * MOCK photo attachment (placeholder tile only). OUTSTANDING: real capture and background upload
 * through SAS URLs (FE-011), never saved to the device gallery (FE-024).
 */
export function createMockPhoto(): ExamPhoto {
  return { id: newMockId('photo') };
}

export async function getArrivalDraft(): Promise<ArrivalDraft | null> {
  await simulateLatency(0);
  return mockDb.draft;
}

export interface ArrivalDraftPatch {
  details?: ArrivalDetailsInput;
  exam?: ArrivalExamInput | null;
}

export async function saveArrivalDraft(patch: ArrivalDraftPatch): Promise<ArrivalDraft> {
  await simulateLatency(150);
  const previous = mockDb.draft;
  const draft: ArrivalDraft = {
    details: patch.details ?? previous?.details ?? EMPTY_DETAILS,
    exam: patch.exam === undefined ? (previous?.exam ?? null) : patch.exam,
    updatedAt: Date.now(),
  };
  mockDb.draft = draft;
  return draft;
}

export async function clearArrivalDraft(): Promise<void> {
  await simulateLatency(0);
  mockDb.draft = null;
}

/** True when the number already belongs to an active stay. */
export async function isMicrochipTaken(microchip: string): Promise<boolean> {
  await simulateLatency(150);
  return mockDb.animals.some((animal) => animal.microchip === microchip.trim());
}

export interface CompleteArrivalInput {
  details: ArrivalDetailsInput;
  exam: ArrivalExamInput;
}

/** Creates the animal (Active monitoring) and its baseline arrival exam, then discards the draft. */
export async function completeArrival({ details, exam }: CompleteArrivalInput): Promise<Animal> {
  await simulateLatency();
  if (!details.kennel || !details.countryCode || !details.sex) {
    throw new ArrivalError('incomplete', 'Arrival details are incomplete.');
  }
  const microchip = details.microchip.trim();
  if (mockDb.animals.some((animal) => animal.microchip === microchip)) {
    throw new ArrivalError('microchip_taken', 'This microchip number is already registered to an active stay.');
  }

  const animal: Animal = {
    id: newMockId('animal'),
    name: details.name.trim(),
    kennel: details.kennel,
    species: details.species,
    sex: details.sex,
    countryCode: details.countryCode,
    microchip,
    dateOfBirth: parseDdMmYyyy(details.dateOfBirth)?.iso ?? null,
    arrivalDate: todayIso(),
    releaseDate: parseDdMmYyyy(details.releaseDate)?.iso ?? null,
    status: 'active-monitoring',
    // Arrival exam is done now; the first daily inspections are still due.
    today: { arrivalExam: 'done', amInspection: 'due', pmInspection: 'due' },
  };
  const record: ArrivalExamRecord = {
    ...exam,
    id: newMockId('exam'),
    animalId: animal.id,
    examinedAt: Date.now(),
  };
  mockDb.animals.push(animal);
  mockDb.exams.push(record);
  mockDb.draft = null;
  return animal;
}

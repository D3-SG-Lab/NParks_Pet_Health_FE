/**
 * Arrival (New Arrival + Arrival Exam) data access.
 *
 * With EXPO_PUBLIC_API_URL set, kennels, countries, the microchip check, the draft and "complete
 * arrival" go to the backend (arrivalBackend.ts, which lists the backend gaps it works around).
 * Otherwise everything reads and writes the in-memory demo store, as below.
 *
 * Always demo data: the vet list (no AQC vet endpoint yet). The demo animals stay alongside the backend's
 * (kennel occupants and the microchip check include them), and a completed arrival is added to the
 * demo store at once so inspections, medication and cases, still mocked, can use it.
 * The backend must enforce microchip uniqueness and that only officers can create arrivals.
 */
import { isApiEnabled } from '@/api';
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
import { invalidateAnimals } from '@/features/animals/animalSource';
import { mockCountries, mockDb, mockKennels, mockVets, newMockId } from '@/mock/db';
import { simulateLatency } from '@/mock/latency';
import { parseDdMmYyyy, todayIso } from '@/utils/dates';

import * as backend from './arrivalBackend';
import { ArrivalError } from './arrivalError';
import { EMPTY_DETAILS } from './validation';

export { ArrivalError, type ArrivalErrorKind } from './arrivalError';

/** Logs a failed background sync of the draft; the device copy is still saved. */
function warnDraftSync(action: string) {
  return (error: unknown) => {
    if (__DEV__) console.warn(`Arrival draft: couldn't ${action} on the server.`, error);
  };
}

export interface KennelOption {
  code: string;
  block: string;
  /** Name of the animal currently in this kennel, for information only. */
  occupant: string | null;
}

/** The animal in this kennel in the demo store (with the API on, demo animals are not on the backend). */
function demoOccupant(code: string): string | null {
  return mockDb.animals.find((animal) => animal.kennel === code)?.name ?? null;
}

export async function listKennelOptions(): Promise<KennelOption[]> {
  if (isApiEnabled()) {
    const kennels = await backend.listKennelOptions();
    return kennels.map((kennel) => ({ ...kennel, occupant: kennel.occupant ?? demoOccupant(kennel.code) }));
  }
  await simulateLatency();
  return mockKennels.map((kennel) => ({ ...kennel, occupant: demoOccupant(kennel.code) }));
}

export async function listVets(): Promise<Vet[]> {
  await simulateLatency();
  return [...mockVets];
}

export async function listCountries(): Promise<Country[]> {
  if (isApiEnabled()) return backend.listCountries();
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

/** The device copy first; with the API on and nothing on the device, the server copy (if it has details). */
export async function getArrivalDraft(): Promise<ArrivalDraft | null> {
  await simulateLatency(0);
  if (mockDb.draft || !isApiEnabled()) return mockDb.draft;
  try {
    mockDb.draft = await backend.loadDraft();
  } catch (error) {
    // A draft is a convenience: a failed load must not block registering an arrival.
    warnDraftSync('load the draft')(error);
  }
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
  if (isApiEnabled() && patch.exam !== undefined) await backend.saveExamDraft(draft.exam).catch(warnDraftSync('save the exam'));
  return draft;
}

export async function clearArrivalDraft(): Promise<void> {
  await simulateLatency(0);
  mockDb.draft = null;
  if (isApiEnabled()) await backend.deleteDraft().catch(warnDraftSync('delete the draft'));
}

/** True when the number already belongs to an active stay. */
export async function isMicrochipTaken(microchip: string): Promise<boolean> {
  const demoTaken = mockDb.animals.some((animal) => animal.microchip === microchip.trim());
  if (isApiEnabled()) return demoTaken || backend.isMicrochipTaken(microchip);
  await simulateLatency(150);
  return mockDb.animals.some((animal) => animal.microchip === microchip.trim());
}

export interface CompleteArrivalInput {
  details: ArrivalDetailsInput;
  exam: ArrivalExamInput;
}

/** Creates the animal (Active monitoring) and its baseline arrival exam, then discards the draft. */
export async function completeArrival({ details, exam }: CompleteArrivalInput): Promise<Animal> {
  if (!details.kennel || !details.countryCode || !details.sex) {
    throw new ArrivalError('incomplete', 'Arrival details are incomplete.');
  }
  if (isApiEnabled()) {
    const animal = backend.toAnimal(await backend.completeArrival(details, exam));
    // Show it at once; the next read refreshes the animals from GET /animals anyway.
    mockDb.animals.push(animal);
    mockDb.exams.push({ ...exam, id: newMockId('exam'), animalId: animal.id, examinedAt: Date.now() });
    invalidateAnimals();
    await clearArrivalDraft();
    return animal;
  }
  await simulateLatency();
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

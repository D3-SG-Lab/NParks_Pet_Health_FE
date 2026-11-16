/**
 * Arrival (New Arrival + Arrival Exam) data access.
 *
 * With EXPO_PUBLIC_API_URL set, kennels, countries, the microchip check, the draft and the arrival go to
 * the backend (arrivalBackend.ts, which lists the backend gaps it works around): completing step 1
 * registers the stay (registerArrival → POST /animals) and completing step 2 saves its exam
 * (completeArrival → POST /animals/{stayId}/exam). Otherwise everything reads and writes the in-memory
 * demo store, as below, and the animal is only created when the exam is completed.
 *
 * The vet list comes from GET /master-data/vet-specialisations (see arrivalBackend.ts). The demo animals stay alongside the backend's
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
  Vet,
} from '@/domain/types';
import { ensureAnimal, invalidateAnimals } from '@/features/animals/animalSource';
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
  if (isApiEnabled()) return backend.listVets();
  await simulateLatency();
  return [...mockVets];
}

export async function listCountries(): Promise<Country[]> {
  if (isApiEnabled()) return backend.listCountries();
  await simulateLatency();
  return [...mockCountries];
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
    registeredStay: previous?.registeredStay ?? null,
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

/** True when the number already belongs to an active stay (other than this arrival's own, once registered). */
export async function isMicrochipTaken(microchip: string): Promise<boolean> {
  const own = mockDb.draft?.registeredStay;
  if (own && own.details.microchip.trim() === microchip.trim()) return false;
  const demoTaken = mockDb.animals.some((animal) => animal.microchip === microchip.trim());
  if (isApiEnabled()) return demoTaken || backend.isMicrochipTaken(microchip);
  await simulateLatency(150);
  return mockDb.animals.some((animal) => animal.microchip === microchip.trim());
}

/** The fields POST /animals sends (the release date is not one of them). */
function sameRegistration(a: ArrivalDetailsInput, b: ArrivalDetailsInput): boolean {
  return (
    a.name.trim() === b.name.trim() &&
    a.kennel === b.kennel &&
    a.species === b.species &&
    a.countryCode === b.countryCode &&
    a.microchip.trim() === b.microchip.trim() &&
    a.sex === b.sex &&
    (parseDdMmYyyy(a.dateOfBirth)?.iso ?? null) === (parseDdMmYyyy(b.dateOfBirth)?.iso ?? null)
  );
}

function assertComplete(
  details: ArrivalDetailsInput,
): asserts details is ArrivalDetailsInput & { kennel: string; countryCode: string; sex: NonNullable<ArrivalDetailsInput['sex']> } {
  if (!details.kennel || !details.countryCode || !details.sex) {
    throw new ArrivalError('incomplete', 'Arrival details are incomplete.');
  }
}

/**
 * Completing step 1. With the API on, registers the stay (POST /animals) with the arrival exam still due,
 * and keeps its id in the draft for step 2. Going back and continuing again reuses it; the backend has no
 * endpoint to edit a stay, so changed details are refused. Without the API, nothing to do: the demo
 * animal is created with its exam.
 */
export async function registerArrival(details: ArrivalDetailsInput): Promise<ArrivalDraft | null> {
  if (!isApiEnabled()) return mockDb.draft;
  assertComplete(details);
  const draft = mockDb.draft;
  const registered = draft?.registeredStay;
  if (registered) {
    if (sameRegistration(registered.details, details)) return draft;
    throw new ArrivalError(
      'already_registered',
      `${registered.details.name.trim()} is already registered with the earlier details, which can't be changed yet. Undo the changes to continue to the exam.`,
    );
  }
  const stay = await backend.registerStay(details);
  mockDb.animals = [...mockDb.animals.filter((a) => a.id !== String(stay.id)), backend.toAnimal(stay, false)];
  invalidateAnimals();
  mockDb.draft = {
    details,
    exam: draft?.exam ?? null,
    updatedAt: Date.now(),
    registeredStay: { id: String(stay.id), details },
  };
  return mockDb.draft;
}

export interface CompleteArrivalInput {
  details: ArrivalDetailsInput;
  exam: ArrivalExamInput;
}

/** Creates the animal (Active monitoring) and its baseline arrival exam, then discards the draft. */
export async function completeArrival({ details, exam }: CompleteArrivalInput): Promise<Animal> {
  assertComplete(details);
  if (isApiEnabled()) {
    // Normally registered on completing step 1; a draft restored from the server has no stay yet.
    const stayId = (await registerArrival(details))?.registeredStay?.id;
    if (!stayId) throw new ArrivalError('incomplete', 'Arrival details are incomplete.');
    await backend.submitExam(stayId, exam);
    // Show the exam as done at once; the next read refreshes the animals from GET /animals anyway.
    if (!mockDb.exams.some((e) => e.animalId === stayId)) {
      mockDb.exams.push({ ...exam, id: newMockId('exam'), animalId: stayId, examinedAt: Date.now() });
    }
    await ensureAnimal(stayId);
    const animal = mockDb.animals.find((a) => a.id === stayId);
    if (!animal) throw new ArrivalError('incomplete', 'The registered arrival could not be found.');
    animal.today = { ...animal.today, arrivalExam: 'done' };
    invalidateAnimals();
    await clearArrivalDraft();
    return { ...animal };
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

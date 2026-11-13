/**
 * Animals from the backend: GET /animals?status=staying, GET /animals/{id}, GET /animals/{id}/exam, plus
 * each animal's inspections (GET /animals/{id}/inspections) so the inspection board and today's AM/PM
 * status come from the server. The animal profile also loads the animal's observations and today's
 * medication (loadAnimalRecords).
 *
 * The feature data layers read animals and records from the in-memory store, so with the API on this
 * module merges the backend's data into that store, next to the demo animals (unless
 * EXPO_PUBLIC_DEMO_DATA=false). Backend records have numeric ids; demo ones keep "animal-N", "obs-N", ….
 * Without the API the functions do nothing.
 */
import { ApiError, isApiEnabled, unwrap } from '@/api';
import { getApiV1Animals, getApiV1AnimalsById, getApiV1AnimalsByStayIdExam } from '@/api/generated';
import type { AnimalStayResponse } from '@/api/generated';
import type { Animal } from '@/domain/types';
import { toAnimal, toExamRecord } from '@/features/arrivals/arrivalBackend';
import { loadInspections } from '@/features/inspections/inspectionBackend';
import { getDay } from '@/features/medication/medicationBackend';
import { loadObservations } from '@/features/observations/observationBackend';
import { mockDb } from '@/mock/db';
import { isBackendId } from '@/mock/scope';
import { isoDateOf } from '@/utils/dates';

/** Several screens load at once; within this window they share one fetch. */
const FRESH_MS = 3_000;

let inFlight: Promise<void> | null = null;
let syncedAt = 0;

/** Fetches the stay's arrival exam into the store. False when it has none yet (404). */
async function loadExam(animalId: string): Promise<boolean> {
  if (mockDb.exams.some((e) => e.animalId === animalId)) return true;
  try {
    const exam = await unwrap(getApiV1AnimalsByStayIdExam({ path: { stayId: Number(animalId) } }));
    mockDb.exams.push(toExamRecord(exam));
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

async function toStoredAnimal(stay: AnimalStayResponse): Promise<Animal> {
  const id = String(stay.id);
  const known = mockDb.animals.find((a) => a.id === id);
  const [examDone, inspections] = await Promise.all([known?.today.arrivalExam === 'done' || loadExam(id), loadInspections(id)]);
  const today = isoDateOf(Date.now());
  const done = (session: 'AM' | 'PM') => (inspections.some((i) => i.date === today && i.session === session) ? 'done' : 'due');
  const animal = toAnimal(stay, examDone);
  return { ...animal, today: { ...animal.today, amInspection: done('AM'), pmInspection: done('PM') } };
}

async function sync(): Promise<void> {
  const stays = await unwrap(getApiV1Animals({ query: { status: 'staying' } }));
  const fromBackend = await Promise.all(stays.map(toStoredAnimal));
  mockDb.animals = [...mockDb.animals.filter((a) => !isBackendId(a.id)), ...fromBackend];
  syncedAt = Date.now();
}

/** Refreshes the store's animals from the backend (staying animals only). */
export function syncAnimals(): Promise<void> {
  if (!isApiEnabled()) return Promise.resolve();
  if (inFlight) return inFlight;
  if (Date.now() - syncedAt < FRESH_MS) return Promise.resolve();
  inFlight = sync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Makes sure one animal is in the store, e.g. a profile opened from a link. False if the backend has none. */
export async function ensureAnimal(animalId: string): Promise<boolean> {
  if (!isApiEnabled() || mockDb.animals.some((a) => a.id === animalId)) return true;
  if (!isBackendId(animalId)) return false;
  try {
    const stay = await unwrap(getApiV1AnimalsById({ path: { id: Number(animalId) } }));
    // Released and deceased stays are not shown: the app only has an active-monitoring status.
    if (stay.status !== 'staying') return false;
    mockDb.animals.push(await toStoredAnimal(stay));
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return false;
    throw error;
  }
}

/**
 * Loads a backend animal's observations and today's medication into the store, for its profile and
 * timeline. Servers without the medication endpoints answer 404, which leaves the animal without doses.
 */
export async function loadAnimalRecords(animalId: string, now: number = Date.now()): Promise<void> {
  if (!isApiEnabled() || !isBackendId(animalId)) return;
  await Promise.all([
    loadObservations(animalId),
    getDay(animalId, isoDateOf(now)).catch((error: unknown) => {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }),
  ]);
}

/** Forgets the last sync, so the next read fetches again (after an arrival or sign-out). */
export function invalidateAnimals(): void {
  syncedAt = 0;
}

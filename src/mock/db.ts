/**
 * In-memory mock store. Lives only for the current app session and is NOT a backend: nothing here
 * is sent anywhere or persisted. Feature API layers (src/features/<name>/*Api.ts) are the only
 * modules that import it, so swapping in generated API calls later does not touch any screen.
 */
import type {
  Animal,
  ArrivalDraft,
  ArrivalExamRecord,
  Country,
  HealthCase,
  Kennel,
  OperationsAlert,
  Vet,
} from '@/domain/types';

import {
  SEED_ALERTS,
  SEED_ANIMALS,
  SEED_CASES,
  SEED_COUNTRIES,
  SEED_KENNELS,
  SEED_REVIEW_QUEUE_COUNT,
  SEED_VETS,
} from './seed';

interface MockState {
  animals: Animal[];
  cases: HealthCase[];
  alerts: OperationsAlert[];
  exams: ArrivalExamRecord[];
  draft: ArrivalDraft | null;
  reviewQueueCount: number;
  nextId: number;
}

function initialState(): MockState {
  return {
    animals: SEED_ANIMALS.map((animal) => ({ ...animal, today: { ...animal.today } })),
    cases: SEED_CASES.map((c) => ({ ...c })),
    alerts: SEED_ALERTS.map((a) => ({ ...a })),
    exams: [],
    draft: null,
    reviewQueueCount: SEED_REVIEW_QUEUE_COUNT,
    nextId: SEED_ANIMALS.length + 1,
  };
}

export const mockDb: MockState = initialState();

export const mockKennels: readonly Kennel[] = SEED_KENNELS;
export const mockVets: readonly Vet[] = SEED_VETS;
export const mockCountries: readonly Country[] = SEED_COUNTRIES;

/** Restores the seed data. Used by tests and when the demo session ends. */
export function resetMockDb(): void {
  Object.assign(mockDb, initialState());
}

export function newMockId(prefix: string): string {
  const id = `${prefix}-${mockDb.nextId}`;
  mockDb.nextId += 1;
  return id;
}

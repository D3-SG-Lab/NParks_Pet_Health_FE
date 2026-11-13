/**
 * In-memory mock store. Lives only for the current app session and is NOT a backend: nothing here
 * is sent anywhere or persisted. Feature API layers (src/features/<name>/*Api.ts) are the only
 * modules that import it, so swapping in generated API calls later does not touch any screen.
 *
 * With the backend on, backend records are merged in here too (src/features/animals/animalSource.ts and
 * the features' *Backend.ts modules). EXPO_PUBLIC_DEMO_DATA=false then starts the store without the demo
 * animals and their records, so only backend data shows.
 */
import { isApiEnabled } from '@/api';
import { env } from '@/config/env';
import type {
  Animal,
  ArrivalDraft,
  ArrivalExamRecord,
  ClinicalSign,
  Country,
  HealthCase,
  InspectionRecord,
  Kennel,
  MedicationAdministration,
  MedicationSchedule,
  Observation,
  OperationsAlert,
  StaffMember,
  SyncItem,
  Vet,
} from '@/domain/types';

import {
  SEED_ANIMALS,
  SEED_CONTRACTOR_KENNELS,
  SEED_COUNTRIES,
  SEED_KENNELS,
  SEED_SIGNS,
  SEED_STAFF,
  SEED_VETS,
  createSeedRecords,
  type SeedRecords,
} from './seed';

/** Device-side outbox entry: the sync item plus the mock upload schedule. */
export interface OutboxEntry extends SyncItem {
  /** When this item starts uploading (set when a sync run starts). */
  startAt: number | null;
  /** Demo: fail the first upload attempt halfway, so Retry can be shown. */
  failOnce: boolean;
}

interface MockState {
  animals: Animal[];
  cases: HealthCase[];
  alerts: OperationsAlert[];
  exams: ArrivalExamRecord[];
  inspections: InspectionRecord[];
  observations: Observation[];
  schedules: MedicationSchedule[];
  administrations: MedicationAdministration[];
  staff: StaffMember[];
  /** Animal IDs most recently picked in the animal picker, newest first. */
  recentAnimalIds: string[];
  draft: ArrivalDraft | null;
  /** Simulated connectivity (FE-018). Toggled from the account sheet in the demo. */
  online: boolean;
  /** Records saved on the device while offline, oldest first (sent in order). */
  outbox: OutboxEntry[];
  nextId: number;
}

function noRecords(): SeedRecords {
  return { alerts: [], exams: [], inspections: [], observations: [], cases: [], schedules: [], administrations: [] };
}

function initialState(): MockState {
  const demo = !isApiEnabled() || env.demoData;
  const records = demo ? createSeedRecords() : noRecords();
  return {
    animals: demo ? SEED_ANIMALS.map((animal) => ({ ...animal, today: { ...animal.today } })) : [],
    ...records,
    staff: SEED_STAFF.map((member) => ({ ...member })),
    recentAnimalIds: demo ? ['animal-2', 'animal-4'] : [],
    draft: null,
    online: true,
    outbox: [],
    nextId: 1000,
  };
}

export const mockDb: MockState = initialState();

export const mockKennels: readonly Kennel[] = SEED_KENNELS;
export const mockVets: readonly Vet[] = SEED_VETS;
export const mockCountries: readonly Country[] = SEED_COUNTRIES;
export const mockSigns: readonly ClinicalSign[] = SEED_SIGNS;
export const mockContractorKennels: readonly string[] = SEED_CONTRACTOR_KENNELS;

/** Restores the seed data. Used by tests and when the demo session ends. */
export function resetMockDb(): void {
  Object.assign(mockDb, initialState());
}

export function newMockId(prefix: string): string {
  const id = `${prefix}-${mockDb.nextId}`;
  mockDb.nextId += 1;
  return id;
}
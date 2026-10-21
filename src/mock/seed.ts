/**
 * Demo seed data. Used only by the in-memory mock store (src/mock/db.ts) so the app can be shown
 * without a backend. None of this is real; it is replaced by API responses later.
 */
import type { Animal, Country, HealthCase, Kennel, OperationsAlert, Vet } from '@/domain/types';

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

export const SEED_VETS: readonly Vet[] = [
  { id: 'vet-1', name: 'Dr. Priya Nair' },
  { id: 'vet-2', name: 'Dr. Daniel Tan' },
  { id: 'vet-3', name: 'Dr. Aisha Rahman' },
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

export const SEED_CASES: readonly HealthCase[] = [
  { id: 'C-2026-0142', animalId: 'animal-2', finding: 'GI signs', status: 'review' },
  { id: 'C-2026-0138', animalId: 'animal-4', finding: 'Reduced appetite', status: 'open' },
  { id: 'C-2026-0121', animalId: 'animal-5', finding: 'Sneezing and nasal discharge', status: 'open' },
  { id: 'C-2026-0107', animalId: 'animal-1', finding: 'Skin irritation', status: 'closed' },
];

export const SEED_ALERTS: readonly OperationsAlert[] = [
  {
    id: 'alert-1',
    animalId: 'animal-2',
    caseId: 'C-2026-0142',
    kind: 'review',
    message: 'GI observation requires review',
  },
  {
    id: 'alert-2',
    animalId: 'animal-4',
    caseId: 'C-2026-0138',
    kind: 'open',
    message: 'Follow-up overdue · Reduced appetite',
  },
  {
    id: 'alert-3',
    animalId: 'animal-5',
    caseId: 'C-2026-0121',
    kind: 'open',
    message: 'Case reopened · related signs',
  },
];

/** Observations waiting in the review queue (wireframe 12 lists three). */
export const SEED_REVIEW_QUEUE_COUNT = 3;

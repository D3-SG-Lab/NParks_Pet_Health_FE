/**
 * Medication endpoints on the real backend (Postman "Medication (AQC)"), for animals that come from the
 * backend. Used by medicationApi.ts and the animal profile when EXPO_PUBLIC_API_URL is set.
 *
 * - GET  /api/v1/medication/animals?date=YYYY-MM-DD        animals with medication that day (overdue first)
 * - GET  /api/v1/animals/{stayId}/medication?date=…        that animal's dose slots, status computed by the server
 * - POST /api/v1/medication/administrations                record a dose (one per slot; 409 otherwise)
 *
 * These are not in the server's OpenAPI spec yet, so they use the hand-typed calls in src/api/manual.ts.
 * The day's schedules and doses are also cached in the store, so the animal profile's medication count
 * and timeline include them. Errors are thrown as ApiError; medicationApi.ts maps them for the screens.
 */
import { unwrap } from '@/api';
import {
  getAnimalMedicationDay,
  listMedicationAnimals,
  recordMedicationAdministration,
  type DoseSlotDto,
  type MedicationAdministrationDto,
  type MedicationAnimalDto,
} from '@/api/manual';
import {
  SEXES,
  SPECIES,
  type Animal,
  type DoseSlot,
  type DoseStatus,
  type MedicationAdministration,
  type MedicationSchedule,
} from '@/domain/types';
import { mockDb } from '@/mock/db';

const DOSE_STATUSES: readonly DoseStatus[] = ['upcoming', 'due', 'overdue', 'administered'];

function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return values.find((v) => v === value) ?? fallback;
}

/** The store's copy of the animal when it has one (same backend id), else the response's. */
function toAnimal(dto: MedicationAnimalDto): Animal {
  const id = String(dto.id);
  const known = mockDb.animals.find((a) => a.id === id);
  if (known) return known;
  const check = (value: string) => (value === 'done' ? 'done' : 'due');
  return {
    id,
    name: dto.name,
    kennel: dto.kennel,
    species: oneOf(SPECIES, dto.species, 'Other'),
    sex: oneOf(SEXES, dto.sex, 'Unknown'),
    countryCode: dto.countryCode,
    microchip: dto.microchip,
    dateOfBirth: dto.dateOfBirth,
    arrivalDate: dto.arrivalDate,
    releaseDate: dto.releaseDate,
    status: 'active-monitoring',
    today: { arrivalExam: check(dto.today.arrivalExam), amInspection: check(dto.today.amInspection), pmInspection: check(dto.today.pmInspection) },
  };
}

export function toAdministration(dto: MedicationAdministrationDto): MedicationAdministration {
  return {
    id: String(dto.id),
    scheduleId: String(dto.scheduleId),
    animalId: String(dto.animalId),
    slot: dto.slot,
    administeredAt: dto.administeredAt,
    by: dto.by,
    remarks: dto.remarks ?? '',
  };
}

function toSlot(dto: DoseSlotDto): DoseSlot {
  return {
    slot: dto.slot,
    scheduleId: String(dto.scheduleId),
    item: dto.item,
    dose: dto.dose,
    frequency: dto.frequency,
    startDate: dto.startDate,
    endDate: dto.endDate,
    time: dto.time,
    status: oneOf(DOSE_STATUSES, dto.status, 'upcoming'),
    administration: dto.administration ? toAdministration(dto.administration) : null,
  };
}

/** Keeps the store's schedules and doses for this animal in step with the server's day. */
function cacheDay(animalId: string, slots: readonly DoseSlot[]) {
  const schedules = new Map<string, MedicationSchedule>();
  for (const slot of slots) {
    const schedule = schedules.get(slot.scheduleId) ?? {
      id: slot.scheduleId,
      animalId,
      item: slot.item,
      dose: slot.dose,
      times: [],
      startDate: slot.startDate,
      endDate: slot.endDate,
    };
    schedule.times.push(slot.time);
    schedules.set(slot.scheduleId, schedule);
  }
  mockDb.schedules = [...mockDb.schedules.filter((s) => s.animalId !== animalId), ...schedules.values()];
  const given = slots.flatMap((s) => (s.administration ? [s.administration] : []));
  const ids = new Set(given.map((a) => a.id));
  mockDb.administrations = [...mockDb.administrations.filter((a) => !ids.has(a.id)), ...given];
}

export interface BackendMedicationAnimal {
  animal: Animal;
  scheduleCount: number;
  dueCount: number;
  overdueCount: number;
}

export async function listAnimals(date: string): Promise<BackendMedicationAnimal[]> {
  const items = await unwrap(listMedicationAnimals(date));
  return items.map((item) => ({ ...item, animal: toAnimal(item.animal) }));
}

export interface BackendMedicationDay {
  animal: Animal;
  scheduleCount: number;
  slots: DoseSlot[];
}

export async function getDay(animalId: string, date: string): Promise<BackendMedicationDay> {
  const day = await unwrap(getAnimalMedicationDay(Number(animalId), date));
  const slots = day.slots.map(toSlot).sort((a, b) => a.time.localeCompare(b.time));
  cacheDay(animalId, slots);
  return { animal: toAnimal(day.animal), scheduleCount: day.scheduleCount, slots };
}

export async function recordDose(scheduleId: string, slot: string, remarks: string): Promise<MedicationAdministration> {
  const administration = toAdministration(
    await unwrap(recordMedicationAdministration({ scheduleId: Number(scheduleId), slot, remarks: remarks.trim() || null })),
  );
  mockDb.administrations.push(administration);
  return administration;
}

/**
 * Medication / supplement administration data access.
 *
 * Backend animals (EXPO_PUBLIC_API_URL set): the animal list, each animal's dose slots and "record
 * administration" use GET /medication/animals, GET /animals/{stayId}/medication and
 * POST /medication/administrations (medicationBackend.ts); the server computes dose status and captures
 * the time and user. Demo animals stay on the in-memory demo store below.
 * With "Work offline (demo)" on, doses are kept on the device (simulated outbox) and not sent.
 */
import { ApiError, isApiEnabled } from '@/api';
import { frequencyLabel } from '@/domain/describe';
import type {
  Actor,
  Animal,
  DoseSlot,
  DoseStatus,
  MedicationAdministration,
  MedicationSchedule,
} from '@/domain/types';
import { ensureAnimal, syncAnimals } from '@/features/animals/animalSource';
import { mockDb, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { ScopeError, animalsInScope, canSeeAnimal, isBackendId } from '@/mock/scope';
import { isOnline, queueIfOffline } from '@/mock/sync';
import { formatTime, isoDateOf, msAt } from '@/utils/dates';

import * as backend from './medicationBackend';

/** Backend medication calls run only with the API on and the device online (not in "Work offline (demo)"). */
function viaBackend(id: string): boolean {
  return isApiEnabled() && isOnline() && isBackendId(id);
}

/** The medication endpoints answer 404 on servers that don't have them yet: no backend medication then. */
async function backendAnimals(date: string): Promise<MedicationAnimal[]> {
  if (!isApiEnabled() || !isOnline()) return [];
  try {
    return await backend.listAnimals(date);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    if (__DEV__) console.warn('Medication: GET /medication/animals is not available on this server.', error);
    return [];
  }
}

/** A dose is "due" from this long before its time until this long after; later it is overdue. */
export const DOSE_WINDOW_MS = 60 * 60_000;

export class MedicationError extends Error {
  readonly kind: 'already_recorded' | 'not_due' | 'not_found';
  constructor(kind: MedicationError['kind'], message: string) {
    super(message);
    this.name = 'MedicationError';
    this.kind = kind;
  }
}

export function doseStatus(slotMs: number, administered: boolean, now: number): DoseStatus {
  if (administered) return 'administered';
  if (now < slotMs - DOSE_WINDOW_MS) return 'upcoming';
  if (now <= slotMs + DOSE_WINDOW_MS) return 'due';
  return 'overdue';
}

function activeSchedules(animalId: string, date: string): MedicationSchedule[] {
  return mockDb.schedules.filter((s) => s.animalId === animalId && s.startDate <= date && s.endDate >= date);
}

/** Today's dose slots for one animal, in time order. */
export function buildDoseSlots(animalId: string, now: number): DoseSlot[] {
  const date = isoDateOf(now);
  return activeSchedules(animalId, date)
    .flatMap((schedule) =>
      schedule.times.map((time) => {
        const slot = `${date}T${time}`;
        const administration = mockDb.administrations.find((a) => a.scheduleId === schedule.id && a.slot === slot) ?? null;
        return {
          slot,
          scheduleId: schedule.id,
          item: schedule.item,
          dose: schedule.dose,
          frequency: frequencyLabel(schedule.times.length),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          time,
          status: doseStatus(msAt(date, time), administration !== null, now),
          administration,
        };
      }),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

export interface MedicationAnimal {
  animal: Animal;
  scheduleCount: number;
  dueCount: number;
  overdueCount: number;
}

/** Animals in scope that have medication today, those needing a dose first. */
export async function listMedicationAnimals(actor: Actor, now: number = Date.now()): Promise<MedicationAnimal[]> {
  await simulateLatency();
  await syncAnimals();
  const date = isoDateOf(now);
  const fromBackend = await backendAnimals(date);
  const demo = animalsInScope(actor)
    .filter((animal) => !isBackendId(animal.id))
    .map((animal) => {
      const slots = buildDoseSlots(animal.id, now);
      return {
        animal,
        scheduleCount: activeSchedules(animal.id, date).length,
        dueCount: slots.filter((s) => s.status === 'due').length,
        overdueCount: slots.filter((s) => s.status === 'overdue').length,
      };
    })
    .filter((item) => item.scheduleCount > 0);
  return overTheWire([...demo, ...fromBackend]
    .sort((a, b) => b.overdueCount + b.dueCount - (a.overdueCount + a.dueCount) || a.animal.kennel.localeCompare(b.animal.kennel, undefined, { numeric: true })));
}

export interface MedicationDay {
  animal: Animal;
  scheduleCount: number;
  slots: DoseSlot[];
}

export async function getMedicationDay(actor: Actor, animalId: string, now: number = Date.now()): Promise<MedicationDay | null> {
  await simulateLatency();
  if (viaBackend(animalId)) {
    try {
      return overTheWire(await backend.getDay(animalId, isoDateOf(now)));
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) throw new ScopeError();
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
  await ensureAnimal(animalId);
  const animal = mockDb.animals.find((a) => a.id === animalId);
  if (!animal) return null;
  if (!canSeeAnimal(actor, animal)) throw new ScopeError();
  return overTheWire({ animal, scheduleCount: activeSchedules(animalId, isoDateOf(now)).length, slots: buildDoseSlots(animalId, now) });
}

export interface RecordDoseInput {
  scheduleId: string;
  slot: string;
  remarks: string;
  actor: Actor;
  now?: number;
}

/** Records a dose. Time and officer are captured here, never typed. A dose can only be recorded once. */
export async function recordAdministration({ scheduleId, slot, remarks, actor, now = Date.now() }: RecordDoseInput): Promise<MedicationAdministration> {
  await simulateLatency();
  if (viaBackend(scheduleId)) {
    try {
      return await backend.recordDose(scheduleId, slot, remarks);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) throw new MedicationError('already_recorded', error.message);
      if (error instanceof ApiError && error.status === 404) throw new MedicationError('not_found', error.message);
      if (error instanceof ApiError && error.status === 403) throw new ScopeError();
      throw error;
    }
  }
  const schedule = mockDb.schedules.find((s) => s.id === scheduleId);
  if (!schedule) throw new MedicationError('not_found', 'This medication is no longer on the schedule.');
  if (mockDb.administrations.some((a) => a.scheduleId === scheduleId && a.slot === slot)) {
    throw new MedicationError('already_recorded', `This ${schedule.item} dose was already recorded.`);
  }
  const [date, time] = slot.split('T');
  if (date && time && doseStatus(msAt(date, time), false, now) === 'upcoming') {
    throw new MedicationError('not_due', `This ${schedule.item} dose is not due yet.`);
  }
  const administration: MedicationAdministration = {
    id: newMockId('adm'),
    scheduleId,
    animalId: schedule.animalId,
    slot,
    administeredAt: now,
    by: actor.name,
    remarks: remarks.trim(),
  };
  mockDb.administrations.push(administration);
  const animal = mockDb.animals.find((a) => a.id === schedule.animalId);
  queueIfOffline({
    kind: 'medication',
    recordId: administration.id,
    title: `Medication · ${animal ? `${animal.kennel} ${animal.name}` : 'animal'}`,
    detail: `${schedule.item} ${schedule.dose} · saved ${formatTime(now)}`,
    savedAt: now,
  });
  return administration;
}
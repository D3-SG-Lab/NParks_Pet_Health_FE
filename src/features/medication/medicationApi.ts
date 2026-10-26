/**
 * Medication / supplement administration data access.
 *
 * MOCK: reads and writes the in-memory demo store. OUTSTANDING endpoints (BE-015): schedules per
 * animal, the due list with missed doses, and "record administration" (time and user captured by
 * the server). The server must also reject a second record for the same dose.
 */
import { frequencyLabel } from '@/domain/describe';
import type {
  Actor,
  Animal,
  DoseSlot,
  DoseStatus,
  MedicationAdministration,
  MedicationSchedule,
} from '@/domain/types';
import { mockDb, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { ScopeError, animalsInScope, canSeeAnimal } from '@/mock/scope';
import { queueIfOffline } from '@/mock/sync';
import { formatTime, isoDateOf, msAt } from '@/utils/dates';

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
  const date = isoDateOf(now);
  return overTheWire(animalsInScope(actor)
    .map((animal) => {
      const slots = buildDoseSlots(animal.id, now);
      return {
        animal,
        scheduleCount: activeSchedules(animal.id, date).length,
        dueCount: slots.filter((s) => s.status === 'due').length,
        overdueCount: slots.filter((s) => s.status === 'overdue').length,
      };
    })
    .filter((item) => item.scheduleCount > 0)
    .sort((a, b) => b.overdueCount + b.dueCount - (a.overdueCount + a.dueCount) || a.animal.kennel.localeCompare(b.animal.kennel, undefined, { numeric: true })));
}

export interface MedicationDay {
  animal: Animal;
  scheduleCount: number;
  slots: DoseSlot[];
}

export async function getMedicationDay(actor: Actor, animalId: string, now: number = Date.now()): Promise<MedicationDay | null> {
  await simulateLatency();
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
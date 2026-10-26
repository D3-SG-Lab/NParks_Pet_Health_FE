/** Pure helpers that turn records into the short text the wireframes show. */
import {
  INSPECTION_SYSTEMS,
  INSPECTION_SYSTEM_LABELS,
  type Animal,
  type ClinicalSystem,
  type InspectionInput,
  type InspectionSystem,
} from './types';

/** "KC2-2 · Yang Yang". */
export function animalTitle(animal: Pick<Animal, 'kennel' | 'name'>): string {
  return `${animal.kennel} · ${animal.name}`;
}

/** Last four digits of the microchip ("Chip …0002"). */
export function chipTail(microchip: string): string {
  return `…${microchip.slice(-4)}`;
}

/** "MC 982 0001 2345 0002": 15 digits grouped 3-4-4-4 for reading aloud and scanning by eye. */
export function formatMicrochip(microchip: string): string {
  const digits = microchip.replace(/\D/g, '');
  const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11), digits.slice(11)].filter(Boolean);
  return `MC ${groups.join(' ')}`;
}

/** Short reference shown to users, e.g. "O-3381" for observation "obs-3381". */
export function observationRef(id: string): string {
  return `O-${id.replace(/^\D+-?/, '')}`;
}

/** When each daily inspection session is due (HH:MM). */
export const SESSION_DUE_TIME = { AM: '08:00', PM: '16:00' } as const;

/** A check counts as overdue this long after its due time. */
export const OVERDUE_AFTER_MS = 2 * 60 * 60_000;

export function abnormalSystems(input: Pick<InspectionInput, 'systems'>): InspectionSystem[] {
  return INSPECTION_SYSTEMS.filter((system) => input.systems[system] === 'abnormal');
}

/** Anything other than the healthy defaults, or any free text, counts as abnormal (BE-011). */
export function isInspectionAbnormal(input: InspectionInput): boolean {
  return (
    abnormalSystems(input).length > 0 ||
    input.food !== 'Full' ||
    input.stool !== 'Firm' ||
    input.urine !== 'Yes' ||
    input.otherFindings.trim().length > 0
  );
}

/** "All normal · Food: Full · Stool: Firm · Urine: Yes", or the abnormal items first. */
export function describeInspection(input: InspectionInput): string {
  const intake = `Food: ${input.food} · Stool: ${input.stool} · Urine: ${input.urine}`;
  const abnormal = abnormalSystems(input).map((system) => `${INSPECTION_SYSTEM_LABELS[system]}: abnormal`);
  const note = input.otherFindings.trim();
  if (abnormal.length === 0 && !isInspectionAbnormal(input)) return `All normal · ${intake}`;
  return [...abnormal, intake, note].filter(Boolean).join(' · ');
}

/** Short case-event text for the abnormal parts of an inspection, e.g. "Stool: Soft". */
export function describeInspectionFindings(input: InspectionInput): string {
  const parts: string[] = abnormalSystems(input).map((system) => `${INSPECTION_SYSTEM_LABELS[system]}: abnormal`);
  if (input.food !== 'Full') parts.push(`Food: ${input.food}`);
  if (input.stool !== 'Firm') parts.push(`Stool: ${input.stool}`);
  // (Watery and None are abnormal too; they fall under the same "not Firm" rule.)
  if (input.urine !== 'Yes') parts.push('Urine: No');
  return parts.join(' · ') || 'Other findings noted';
}

const SYSTEM_FOR: Record<InspectionSystem, ClinicalSystem> = {
  skin: 'Skin',
  eyes: 'Eyes',
  nose: 'Respiratory',
  ears: 'Ears',
  mouth: 'GI',
  hydration: 'General',
  cardiorespiratory: 'Respiratory',
};

/** Clinical systems an inspection's abnormal items relate to (used to link it to open cases). */
export function inspectionClinicalSystems(input: InspectionInput): ClinicalSystem[] {
  const systems = new Set<ClinicalSystem>(abnormalSystems(input).map((system) => SYSTEM_FOR[system]));
  if (input.food !== 'Full' || input.stool !== 'Firm') systems.add('GI');
  if (input.urine !== 'Yes') systems.add('General');
  return [...systems];
}

/** "2x daily". */
export function frequencyLabel(timesPerDay: number): string {
  return `${timesPerDay}x daily`;
}
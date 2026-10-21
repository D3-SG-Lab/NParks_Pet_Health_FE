import {
  EXAM_SYSTEMS,
  type ArrivalDetailsInput,
  type ArrivalExamInput,
  type ExamSystem,
} from '@/domain/types';
import { parseDdMmYyyy, todayIso } from '@/utils/dates';

export const MICROCHIP_LENGTH = 15;

export type DetailsField = 'name' | 'kennel' | 'species' | 'countryCode' | 'microchip' | 'sex' | 'dateOfBirth' | 'releaseDate';
export type DetailsErrors = Partial<Record<DetailsField, string>>;

export const EMPTY_DETAILS: ArrivalDetailsInput = {
  name: '',
  kennel: null,
  species: 'Dog',
  countryCode: null,
  microchip: '',
  sex: null,
  dateOfBirth: '',
  releaseDate: '',
};

export function createEmptyExam(): ArrivalExamInput {
  const findings = {} as ArrivalExamInput['findings'];
  for (const system of EXAM_SYSTEMS) findings[system] = { abnormal: false, note: '', photos: [] };
  return { vetId: null, weightKg: '', mentation: 'Responsive', findings };
}

/** Format-only microchip check. Uniqueness across active stays is checked against the data source. */
export function validateMicrochipFormat(value: string): string | undefined {
  if (!value.trim()) return 'Enter the microchip number.';
  if (!/^\d+$/.test(value)) return 'Use digits only.';
  if (value.length !== MICROCHIP_LENGTH) return `Microchip number must be ${MICROCHIP_LENGTH} digits.`;
  return undefined;
}

export function validateDetails(input: ArrivalDetailsInput, today: string = todayIso()): DetailsErrors {
  const errors: DetailsErrors = {};
  if (!input.name.trim()) errors.name = 'Enter the pet name.';
  if (!input.kennel) errors.kennel = 'Select a kennel / room.';
  if (!input.countryCode) errors.countryCode = 'Select the country of origin.';
  if (!input.sex) errors.sex = 'Select the sex.';
  const chipError = validateMicrochipFormat(input.microchip);
  if (chipError) errors.microchip = chipError;

  // Dates are optional in the wireframe; when typed they must be real calendar dates.
  const dob = input.dateOfBirth.trim() ? parseDdMmYyyy(input.dateOfBirth) : null;
  if (input.dateOfBirth.trim()) {
    if (!dob) errors.dateOfBirth = 'Use DD/MM/YYYY.';
    else if (dob.iso > today) errors.dateOfBirth = 'Date of birth cannot be in the future.';
  }
  if (input.releaseDate.trim()) {
    const release = parseDdMmYyyy(input.releaseDate);
    if (!release) errors.releaseDate = 'Use DD/MM/YYYY.';
    else if (dob && release.iso < dob.iso) errors.releaseDate = 'Release date cannot be before date of birth.';
  }
  return errors;
}

export type ExamField = 'vetId' | 'weightKg' | `note:${ExamSystem}`;
export type ExamErrors = Partial<Record<ExamField, string>>;

export function validateExam(input: ArrivalExamInput): ExamErrors {
  const errors: ExamErrors = {};
  if (!input.vetId) errors.vetId = 'Select the examining vet.';
  const weight = Number(input.weightKg.trim());
  if (!input.weightKg.trim()) errors.weightKg = 'Enter the weight in kg.';
  else if (!/^\d+(\.\d+)?$/.test(input.weightKg.trim()) || !Number.isFinite(weight) || weight <= 0) {
    errors.weightKg = 'Enter a weight greater than 0 (e.g. 12.5).';
  }
  for (const system of EXAM_SYSTEMS) {
    const finding = input.findings[system];
    // Backlog rule: a note is required whenever a finding is Abnormal.
    if (finding.abnormal && !finding.note.trim()) errors[`note:${system}`] = 'Note required. Describe the finding.';
  }
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

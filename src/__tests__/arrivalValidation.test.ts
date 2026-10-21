import { createEmptyExam, validateDetails, validateExam, validateMicrochipFormat } from '@/features/arrivals/validation';
import type { ArrivalDetailsInput } from '@/domain/types';
import { formatDateInput, parseDdMmYyyy } from '@/utils/dates';

const valid: ArrivalDetailsInput = {
  name: 'Yang Yang',
  kennel: 'KC2-7',
  species: 'Dog',
  countryCode: 'CN',
  microchip: '982000999999999',
  sex: 'Female',
  dateOfBirth: '',
  releaseDate: '',
};

describe('arrival details validation (wireframe 02)', () => {
  it('accepts a complete form with optional dates left empty', () => {
    expect(validateDetails(valid, '2026-10-21')).toEqual({});
  });

  it('requires name, kennel, country, sex and microchip', () => {
    const errors = validateDetails(
      { ...valid, name: ' ', kennel: null, countryCode: null, sex: null, microchip: '' },
      '2026-10-21',
    );
    expect(Object.keys(errors).sort()).toEqual(['countryCode', 'kennel', 'microchip', 'name', 'sex']);
  });

  it('requires a 15-digit microchip number', () => {
    expect(validateMicrochipFormat('12345')).toMatch(/15 digits/);
    expect(validateMicrochipFormat('98200012345000a')).toMatch(/digits only/i);
    expect(validateMicrochipFormat('982000123456789')).toBeUndefined();
  });

  it('validates typed dates', () => {
    expect(validateDetails({ ...valid, dateOfBirth: '31/02/2020' }, '2026-10-21').dateOfBirth).toMatch(/DD\/MM\/YYYY/);
    expect(validateDetails({ ...valid, dateOfBirth: '01/01/2030' }, '2026-10-21').dateOfBirth).toMatch(/future/);
    expect(
      validateDetails({ ...valid, dateOfBirth: '01/01/2020', releaseDate: '01/01/2019' }, '2026-10-21').releaseDate,
    ).toMatch(/before/);
  });
});

describe('arrival exam validation (wireframe 03)', () => {
  it('requires vet and a positive weight', () => {
    const errors = validateExam(createEmptyExam());
    expect(errors.vetId).toBeDefined();
    expect(errors.weightKg).toBeDefined();
    expect(validateExam({ ...createEmptyExam(), vetId: 'vet-1', weightKg: '0' }).weightKg).toBeDefined();
    expect(validateExam({ ...createEmptyExam(), vetId: 'vet-1', weightKg: '12.5' })).toEqual({});
  });

  it('requires a note when a finding is Abnormal', () => {
    const exam = createEmptyExam();
    exam.vetId = 'vet-1';
    exam.weightKg = '8';
    exam.findings.eyes = { abnormal: true, note: '  ', photos: [] };
    expect(validateExam(exam)['note:eyes']).toMatch(/Note required/);
    exam.findings.eyes = { abnormal: true, note: 'Left eye discharge', photos: [] };
    expect(validateExam(exam)).toEqual({});
  });
});

describe('date helpers', () => {
  it('parses and formats DD/MM/YYYY', () => {
    expect(parseDdMmYyyy('29/02/2024')?.iso).toBe('2024-02-29');
    expect(parseDdMmYyyy('29/02/2023')).toBeNull();
    expect(formatDateInput('01022020')).toBe('01/02/2020');
    expect(formatDateInput('0102')).toBe('01/02');
  });
});

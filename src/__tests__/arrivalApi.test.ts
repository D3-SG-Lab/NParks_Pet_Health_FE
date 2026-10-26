import { resetMockDb } from '@/mock/db';
import {
  ArrivalError,
  clearArrivalDraft,
  completeArrival,
  getArrivalDraft,
  isMicrochipTaken,
  saveArrivalDraft,
} from '@/features/arrivals/arrivalApi';
import { EMPTY_DETAILS, createEmptyExam } from '@/features/arrivals/validation';
import { getOperationsSummary } from '@/features/operations/operationsApi';
import type { ArrivalDetailsInput } from '@/domain/types';

const details: ArrivalDetailsInput = {
  name: ' Nala ',
  kennel: 'KC2-7',
  species: 'Cat',
  countryCode: 'JP',
  microchip: '982000999999991',
  sex: 'Female',
  dateOfBirth: '05/04/2023',
  releaseDate: '19/01/2099',
};

describe('mock arrival data layer', () => {
  beforeEach(() => resetMockDb());

  it('saves, restores and clears the draft', async () => {
    expect(await getArrivalDraft()).toBeNull();
    await saveArrivalDraft({ details: { ...EMPTY_DETAILS, name: 'Draft pet' } });
    expect((await getArrivalDraft())?.details.name).toBe('Draft pet');
    // Saving only the exam keeps the details.
    await saveArrivalDraft({ exam: createEmptyExam() });
    expect((await getArrivalDraft())?.details.name).toBe('Draft pet');
    await clearArrivalDraft();
    expect(await getArrivalDraft()).toBeNull();
  });

  it('detects a microchip that belongs to an active stay', async () => {
    expect(await isMicrochipTaken('982000123450002')).toBe(true);
    expect(await isMicrochipTaken('982000999999991')).toBe(false);
  });

  it('completing the exam adds the animal and updates Operations counts', async () => {
    const before = await getOperationsSummary({ id: 'officer-1', name: 'Test Officer', role: 'officer' });
    await saveArrivalDraft({ details });
    const animal = await completeArrival({ details, exam: { ...createEmptyExam(), vetId: 'vet-1', weightKg: '4.2' } });

    expect(animal.name).toBe('Nala');
    expect(animal.status).toBe('active-monitoring');
    expect(animal.dateOfBirth).toBe('2023-04-05');
    expect(animal.today).toEqual({ arrivalExam: 'done', amInspection: 'due', pmInspection: 'due' });

    const after = await getOperationsSummary({ id: 'officer-1', name: 'Test Officer', role: 'officer' });
    expect(after.activePets).toBe(before.activePets + 1);
    expect(after.checksDue).toBe(before.checksDue + 1);
    expect(after.openCases).toBe(before.openCases);
    expect(await getArrivalDraft()).toBeNull();
    expect(await isMicrochipTaken(details.microchip)).toBe(true);
  });

  it('rejects a duplicate microchip on completion', async () => {
    await expect(
      completeArrival({ details: { ...details, microchip: '982000123450002' }, exam: createEmptyExam() }),
    ).rejects.toMatchObject({ kind: 'microchip_taken' } satisfies Partial<ArrivalError>);
  });
});

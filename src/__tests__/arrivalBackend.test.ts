import { errorMessage } from '@/api/errors';
import * as sdk from '@/api/generated';
import type { AnimalStayResponse } from '@/api/generated';
import type { ArrivalDetailsInput } from '@/domain/types';
import { ArrivalError, completeArrival, getArrivalDraft, isMicrochipTaken, listKennelOptions } from '@/features/arrivals/arrivalApi';
import { createEmptyExam } from '@/features/arrivals/validation';
import { mockDb, resetMockDb } from '@/mock/db';

// API mode on, with the generated SDK mocked: these tests cover the mapping, not the network.
jest.mock('@/api', () => ({ ...jest.requireActual('@/api'), isApiEnabled: () => true }));
jest.mock('@/api/generated', () => ({
  getApiV1Kennels: jest.fn(),
  getApiV1Countries: jest.fn(),
  getApiV1Animals: jest.fn(),
  postApiV1Animals: jest.fn(),
  postApiV1AnimalsByStayIdExam: jest.fn(),
  getApiV1ArrivalDraft: jest.fn(),
  putApiV1ArrivalDraftExam: jest.fn(),
  deleteApiV1ArrivalDraft: jest.fn(),
}));

const api = sdk as jest.Mocked<typeof sdk>;

/** A generated-client result: `{ data, response }` on success, `{ error, response }` otherwise. */
function ok<T>(data: T, status = 200) {
  return Promise.resolve({ data, request: {} as Request, response: { ok: true, status } as Response }) as never;
}
function fail(status: number, error: unknown) {
  return Promise.resolve({ error, request: {} as Request, response: { ok: false, status } as Response }) as never;
}

const details: ArrivalDetailsInput = {
  name: ' Nala ',
  kennel: 'K-02',
  species: 'Cat',
  countryCode: 'JP',
  microchip: '982000999999991',
  sex: 'Female',
  dateOfBirth: '05/04/2023',
  releaseDate: '',
};

const stay: AnimalStayResponse = {
  id: 41,
  name: 'Nala',
  kennelId: 2,
  kennelCode: 'K-02',
  kennelBlock: 'Block A',
  species: 'Cat',
  sex: 'Female',
  countryCode: 'JP',
  countryName: 'Japan',
  microchip: '982000999999991',
  dateOfBirth: '2023-04-05',
  arrivalDate: '2026-11-05',
  releaseDate: null,
  status: 'staying',
  createdBy: 1,
  createdAt: '2026-11-05T02:00:00Z',
  updatedAt: '2026-11-05T02:00:00Z',
};

const kennels = [
  { id: 1, code: 'K-01', block: 'Block A', isActive: true },
  { id: 2, code: 'K-02', block: 'Block A', isActive: true },
];

describe('arrivals on the backend API', () => {
  beforeEach(() => {
    resetMockDb();
    jest.clearAllMocks();
    api.getApiV1Kennels.mockImplementation(() => ok(kennels));
    api.deleteApiV1ArrivalDraft.mockImplementation(() => ok({}, 204));
    api.putApiV1ArrivalDraftExam.mockImplementation(() => ok({}, 204));
  });

  it('lists kennels with their current occupant', async () => {
    api.getApiV1Animals.mockImplementation(() => ok([{ ...stay, kennelId: 1, name: 'Mochi' }]));
    expect(await listKennelOptions()).toEqual([
      { code: 'K-01', block: 'Block A', occupant: 'Mochi' },
      { code: 'K-02', block: 'Block A', occupant: null },
    ]);
  });

  it('checks the microchip against staying animals', async () => {
    api.getApiV1Animals.mockImplementation(() => ok([stay]));
    expect(await isMicrochipTaken(' 982000999999991 ')).toBe(true);
    expect(api.getApiV1Animals).toHaveBeenCalledWith({ query: { status: 'staying', search: '982000999999991' } });
    expect(await isMicrochipTaken('982000999999992')).toBe(false);
  });

  it('creates the stay and its exam, then adds the animal to the demo store', async () => {
    api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
    api.postApiV1AnimalsByStayIdExam.mockImplementation(() => ok({}, 201));
    const exam = { ...createEmptyExam(), weightKg: '4.2', mentation: 'Calm' as const };
    exam.findings.eyes = { abnormal: true, note: ' Mild discharge ', photos: [{ id: 'p1' }] };

    const animal = await completeArrival({ details, exam });

    expect(api.postApiV1Animals).toHaveBeenCalledWith({
      body: expect.objectContaining({ name: 'Nala', kennelId: 2, species: 'Cat', sex: 'Female', countryCode: 'JP', dateOfBirth: '2023-04-05' }),
    });
    const examCall = api.postApiV1AnimalsByStayIdExam.mock.calls[0]?.[0];
    expect(examCall?.path).toEqual({ stayId: 41 });
    expect(examCall?.body).toMatchObject({ vetStaffId: null, weightKg: 4.2, mentation: 'Calm' });
    expect(examCall?.body.findings).toHaveLength(7);
    expect(examCall?.body.findings).toContainEqual({ system: 'eyes', abnormal: true, note: 'Mild discharge', photoKeys: [] });
    expect(animal).toMatchObject({ id: '41', kennel: 'K-02', status: 'active-monitoring' });
    expect(mockDb.animals.some((a) => a.id === '41')).toBe(true);
    expect(api.deleteApiV1ArrivalDraft).toHaveBeenCalled();
  });

  it('reports a microchip conflict from the server', async () => {
    api.postApiV1Animals.mockImplementation(() => fail(409, { error: 'An active stay already exists for this microchip.' }));
    const error = await completeArrival({ details, exam: createEmptyExam() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ArrivalError);
    expect(error).toMatchObject({ kind: 'microchip_taken', message: 'An active stay already exists for this microchip.' });
  });

  it('reuses the created stay when only the exam failed', async () => {
    api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
    api.postApiV1AnimalsByStayIdExam.mockImplementationOnce(() => fail(500, '')).mockImplementationOnce(() => ok({}, 201));
    const input = { details: { ...details, microchip: '982000999999993' }, exam: createEmptyExam() };

    await expect(completeArrival(input)).rejects.toMatchObject({ status: 500 });
    await completeArrival(input);
    expect(api.postApiV1Animals).toHaveBeenCalledTimes(1);
    expect(api.postApiV1AnimalsByStayIdExam).toHaveBeenCalledTimes(2);
  });

  it('treats a failed draft load as no draft', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    api.getApiV1ArrivalDraft.mockImplementation(() => fail(500, ''));
    expect(await getArrivalDraft()).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('API error messages', () => {
  it('reads both error shapes the backend uses', () => {
    expect(errorMessage({ error: 'Animal stay with id 9 not found.' }, 404)).toBe('Animal stay with id 9 not found.');
    expect(errorMessage({ title: 'One or more validation errors occurred.', errors: { Name: ['The Name field is required.'] } }, 400)).toBe(
      'The Name field is required.',
    );
    expect(errorMessage('', 0)).toMatch(/Couldn’t reach the server/);
  });
});

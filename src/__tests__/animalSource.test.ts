import * as sdk from '@/api/generated';
import type { AnimalStayResponse } from '@/api/generated';
import { listAnimals } from '@/features/animals/animalsApi';
import { ensureAnimal, invalidateAnimals, syncAnimals } from '@/features/animals/animalSource';
import { mockDb, resetMockDb } from '@/mock/db';
import { canSeeAnimal } from '@/mock/scope';
import { isoDateOf } from '@/utils/dates';

// API mode on, with the generated SDK mocked: these tests cover the mapping, not the network.
jest.mock('@/api', () => ({ ...jest.requireActual('@/api'), isApiEnabled: () => true }));
jest.mock('@/api/generated', () => ({
  getApiV1Animals: jest.fn(),
  getApiV1AnimalsById: jest.fn(),
  getApiV1AnimalsByStayIdExam: jest.fn(),
  getApiV1AnimalsByStayIdInspections: jest.fn(),
}));

const api = sdk as jest.Mocked<typeof sdk>;

function ok<T>(data: T) {
  return Promise.resolve({ data, request: {} as Request, response: { ok: true, status: 200 } as Response }) as never;
}
function fail(status: number) {
  return Promise.resolve({ error: '', request: {} as Request, response: { ok: false, status } as Response }) as never;
}

function stay(id: number, overrides: Partial<AnimalStayResponse> = {}): AnimalStayResponse {
  return {
    id,
    name: `Pet ${id}`,
    kennelId: id,
    kennelCode: `K-0${id}`,
    kennelBlock: 'Block A',
    species: 'Dog',
    sex: 'Male',
    countryCode: 'SG',
    countryName: 'Singapore',
    microchip: `90008200012345${id}`,
    dateOfBirth: null,
    arrivalDate: '2026-11-01',
    releaseDate: null,
    status: 'staying',
    createdBy: 1,
    createdAt: '2026-11-01T02:00:00Z',
    updatedAt: '2026-11-01T02:00:00Z',
    ...overrides,
  };
}

const exam = {
  id: 7,
  stayId: 1,
  vetStaffId: null,
  weightKg: 12.5,
  mentation: 'Alert',
  examinedAt: '2026-11-01T03:00:00Z',
  recordedBy: 1,
  findings: [{ id: 1, system: 'eyes', abnormal: true, note: 'Mild discharge', photoKeys: [] }],
};

describe('animals from the backend API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAnimals();
    mockDb.animals = [];
    mockDb.exams = [];
    mockDb.inspections = [];
    api.getApiV1AnimalsByStayIdInspections.mockImplementation(() => ok([]));
  });

  it('adds the backend animals next to the demo animals, which keep their records', async () => {
    resetMockDb();
    const demoIds = mockDb.animals.map((a) => a.id);
    api.getApiV1Animals.mockImplementation(() => ok([stay(1)]));
    api.getApiV1AnimalsByStayIdExam.mockImplementation(() => fail(404));

    await syncAnimals();
    expect(mockDb.animals.map((a) => a.id)).toEqual([...demoIds, '1']);
    expect(mockDb.cases.length).toBeGreaterThan(0);

    // A later refresh replaces only the backend animals.
    invalidateAnimals();
    api.getApiV1Animals.mockImplementation(() => ok([stay(2)]));
    await syncAnimals();
    expect(mockDb.animals.map((a) => a.id)).toEqual([...demoIds, '2']);
  });

  it('applies the demo kennel scope to demo animals only', () => {
    const contractor = { id: 'c', name: 'Contractor', role: 'contractor' as const };
    expect(canSeeAnimal(contractor, { id: 'animal-9', kennel: 'KC1-1' })).toBe(false);
    expect(canSeeAnimal(contractor, { id: '12', kennel: 'KC1-1' })).toBe(true);
  });

  it('lists the staying animals with their arrival exam status', async () => {
    api.getApiV1Animals.mockImplementation(() => ok([stay(2), stay(1)]));
    api.getApiV1AnimalsByStayIdExam.mockImplementation((options) => (options.path.stayId === 1 ? ok(exam) : fail(404)));

    const items = await listAnimals({ id: '1', name: 'Officer', role: 'officer' });

    expect(api.getApiV1Animals).toHaveBeenCalledWith({ query: { status: 'staying' } });
    expect(items.map((i) => [i.animal.id, i.animal.kennel, i.animal.today.arrivalExam, i.status])).toEqual([
      ['1', 'K-01', 'done', 'due'],
      ['2', 'K-02', 'due', 'due'],
    ]);
    expect(mockDb.exams).toEqual([
      expect.objectContaining({ id: 'exam-7', animalId: '1', weightKg: '12.5', mentation: 'Alert', vetId: null }),
    ]);
    expect(mockDb.exams[0]?.findings.eyes).toEqual({ abnormal: true, note: 'Mild discharge', photos: [] });
  });

  it('takes today’s AM/PM status from the server’s inspections and shares one fetch', async () => {
    const today = isoDateOf(Date.now());
    api.getApiV1Animals.mockImplementation(() => ok([stay(1)]));
    api.getApiV1AnimalsByStayIdExam.mockImplementation(() => ok(exam));
    api.getApiV1AnimalsByStayIdInspections.mockImplementation(() =>
      ok([
        { id: 101, stayId: 1, inspectionDate: today, session: 'AM', mentation: 'Alert', food: 'Half', stool: 'Soft', urine: 'Yes', otherFindings: null, systemFindings: [{ id: 1, system: 'eyes', finding: 'abnormal' }], recordedBy: 10, recordedAt: `${today}T00:30:00Z` },
        { id: 99, stayId: 1, inspectionDate: '2026-11-01', session: 'PM', mentation: 'Calm', food: 'Full', stool: 'Firm', urine: 'Yes', otherFindings: 'Ok', systemFindings: [], recordedBy: 10, recordedAt: '2026-11-01T08:00:00Z' },
      ]),
    );
    await Promise.all([syncAnimals(), syncAnimals()]);
    expect(api.getApiV1Animals).toHaveBeenCalledTimes(1);
    expect(api.getApiV1AnimalsByStayIdInspections).toHaveBeenCalledWith({ path: { stayId: 1 } });
    expect(mockDb.animals[0]?.today).toEqual({ arrivalExam: 'done', amInspection: 'done', pmInspection: 'due' });
    expect(mockDb.inspections.find((i) => i.id === '101')).toMatchObject({
      animalId: '1',
      session: 'AM',
      food: 'Half',
      stool: 'Soft',
      otherFindings: '',
      recordedBy: 'Staff #10',
      systems: expect.objectContaining({ eyes: 'abnormal', skin: 'normal' }),
    });

    // A refresh replaces the stay's inspections instead of duplicating them; the exam is fetched once.
    invalidateAnimals();
    await syncAnimals();
    expect(mockDb.inspections.filter((i) => i.animalId === '1')).toHaveLength(2);
    expect(api.getApiV1AnimalsByStayIdExam).toHaveBeenCalledTimes(1);
  });

  it('loads one animal by id, ignoring released stays', async () => {
    api.getApiV1AnimalsByStayIdExam.mockImplementation(() => fail(404));
    api.getApiV1AnimalsById.mockImplementation((options) => (options.path.id === 3 ? ok(stay(3)) : options.path.id === 4 ? ok(stay(4, { status: 'released' })) : fail(404)));

    expect(await ensureAnimal('3')).toBe(true);
    expect(mockDb.animals.map((a) => a.id)).toEqual(['3']);
    expect(await ensureAnimal('4')).toBe(false);
    expect(await ensureAnimal('9')).toBe(false);
    expect(await ensureAnimal('animal-2')).toBe(false);
  });
});

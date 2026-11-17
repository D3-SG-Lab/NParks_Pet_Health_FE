import { errorMessage } from '@/api/errors';
import * as sdk from '@/api/generated';
import type { AnimalStayResponse } from '@/api/generated';
import type { ArrivalDetailsInput } from '@/domain/types';
import {
  ArrivalError,
  completeArrival,
  getArrivalDraft,
  isMicrochipTaken,
  listKennelOptions,
  listSpecies,
  listVets,
  registerArrival,
} from '@/features/arrivals/arrivalApi';
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
  getApiV1MasterDataSpecies: jest.fn(),
  getApiV1MasterDataVetSpecialisations: jest.fn(),
  postApiV1MediaPresign: jest.fn(),
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
  status: 'active-monitoring',
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

  it('checks the microchip against active-monitoring animals', async () => {
    api.getApiV1Animals.mockImplementation(() => ok([stay]));
    expect(await isMicrochipTaken(' 982000999999991 ')).toBe(true);
    expect(api.getApiV1Animals).toHaveBeenCalledWith({ query: { status: 'active-monitoring', search: '982000999999991' } });
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

  it('registers the stay on completing step 1, then saves only the exam in step 2', async () => {
    api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
    api.postApiV1AnimalsByStayIdExam.mockImplementation(() => ok({}, 201));

    const draft = await registerArrival(details);
    expect(api.postApiV1Animals).toHaveBeenCalledTimes(1);
    expect(draft?.registeredStay?.id).toBe('41');
    expect(mockDb.animals.find((a) => a.id === '41')?.today.arrivalExam).toBe('due');

    // Back to step 1 and on again with the same details: no second stay, and its own microchip isn't "taken".
    await registerArrival({ ...details, releaseDate: '01/12/2026' });
    expect(api.postApiV1Animals).toHaveBeenCalledTimes(1);
    expect(await isMicrochipTaken(details.microchip)).toBe(false);
    expect(api.getApiV1Animals).not.toHaveBeenCalled();

    const animal = await completeArrival({ details, exam: createEmptyExam() });
    expect(api.postApiV1Animals).toHaveBeenCalledTimes(1);
    expect(api.postApiV1AnimalsByStayIdExam.mock.calls[0]?.[0].path).toEqual({ stayId: 41 });
    expect(animal).toMatchObject({ id: '41', today: { arrivalExam: 'done' } });
    expect(mockDb.draft).toBeNull();
  });

  it('refuses changed details once the stay is registered (no edit endpoint)', async () => {
    api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
    await registerArrival(details);
    const error = await registerArrival({ ...details, kennel: 'K-01' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'already_registered' });
    expect(api.postApiV1Animals).toHaveBeenCalledTimes(1);
  });

  it('reports a microchip conflict when registering step 1', async () => {
    api.postApiV1Animals.mockImplementation(() => fail(409, { error: 'An active stay already exists for this microchip.' }));
    await expect(registerArrival(details)).rejects.toMatchObject({ kind: 'microchip_taken' });
    expect(mockDb.draft?.registeredStay ?? null).toBeNull();
  });

  it('lists the active species by name, with Other last', async () => {
    api.getApiV1MasterDataSpecies.mockImplementation(() =>
      ok(['Other', 'Dog', 'Cat'].map((name, id) => ({ id, name, isActive: true, createdAt: '', updatedAt: '' }))),
    );
    expect(await listSpecies()).toEqual(['Cat', 'Dog', 'Other']);
    expect(api.getApiV1MasterDataSpecies).toHaveBeenCalledWith({ query: { isActive: true } });
  });

  it('lists vets from the active vet specialisations', async () => {
    api.getApiV1MasterDataVetSpecialisations.mockImplementation(() =>
      ok([
        { id: 3, name: 'Yamada', isActive: true, createdAt: '', updatedAt: '' },
        { id: 1, name: 'Surgery', isActive: true, createdAt: '', updatedAt: '' },
      ]),
    );
    expect(await listVets()).toEqual([
      { id: '1', name: 'Surgery' },
      { id: '3', name: 'Yamada' },
    ]);
    expect(api.getApiV1MasterDataVetSpecialisations).toHaveBeenCalledWith({ query: { isActive: true } });
  });

  describe('exam photos', () => {
    const realFetch = global.fetch;
    afterEach(() => {
      global.fetch = realFetch;
    });

    function examWithPhotos() {
      const exam = { ...createEmptyExam(), vetId: '3', weightKg: '4.2' };
      exam.findings.eyes = {
        abnormal: true,
        note: 'Discharge',
        photos: [
          { id: 'ph-1', uri: 'file:///eye1.jpg', fileName: 'eye1.jpg', mimeType: 'image/jpeg' },
          { id: 'ph-2', uri: 'file:///eye2.png' },
        ],
      };
      // Photos of a finding switched back to Normal are not sent.
      exam.findings.ears = { abnormal: false, note: '', photos: [{ id: 'ph-3', uri: 'file:///ear.jpg' }] };
      return exam;
    }

    it('presigns, uploads and sends the media keys with the exam', async () => {
      api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
      api.postApiV1AnimalsByStayIdExam.mockImplementation(() => ok({}, 201));
      api.postApiV1MediaPresign.mockImplementation(() =>
        ok({
          items: [
            { mediaKey: 'uploads/exam/a.jpg', uploadUrl: 'https://storage.test/a', expiresAt: '' },
            { mediaKey: 'uploads/exam/b.png', uploadUrl: 'https://storage.test/b', expiresAt: '' },
          ],
        }),
      );
      const fetchMock = jest.fn(async (url: string) => (url.startsWith('file:') ? { blob: async () => new Blob(['x']) } : { ok: true, status: 200 }));
      global.fetch = fetchMock as unknown as typeof fetch;

      await completeArrival({ details: { ...details, microchip: '982000999999994' }, exam: examWithPhotos() });

      expect(api.postApiV1MediaPresign).toHaveBeenCalledWith({
        body: {
          items: [
            { mediaKind: 'photo', context: 'exam', filename: 'eye1.jpg', contentType: 'image/jpeg' },
            { mediaKind: 'photo', context: 'exam', filename: 'ph-2.png', contentType: 'image/png' },
          ],
        },
      });
      expect(fetchMock).toHaveBeenCalledWith('https://storage.test/a', expect.objectContaining({ method: 'PUT' }));
      const findings = api.postApiV1AnimalsByStayIdExam.mock.calls[0]?.[0].body.findings;
      expect(findings).toContainEqual({ system: 'eyes', abnormal: true, note: 'Discharge', photoKeys: ['uploads/exam/a.jpg', 'uploads/exam/b.png'] });
      expect(findings).toContainEqual({ system: 'ears', abnormal: false, note: null, photoKeys: [] });
      expect(api.postApiV1AnimalsByStayIdExam.mock.calls[0]?.[0].body.vetStaffId).toBe(3);
    });

    it('stops with a clear error when the photo storage is unreachable', async () => {
      api.postApiV1Animals.mockImplementation(() => ok(stay, 201));
      api.postApiV1MediaPresign.mockImplementation(() =>
        ok({ items: [1, 2].map((n) => ({ mediaKey: `k${n}`, uploadUrl: `https://minio_endpoint/${n}`, expiresAt: '' })) }),
      );
      global.fetch = jest.fn(async (url: string) => {
        if (url.startsWith('file:')) return { blob: async () => new Blob(['x']) };
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch;

      const exam = examWithPhotos();
      exam.findings.eyes.photos = exam.findings.eyes.photos.map((p) => ({ ...p, id: `${p.id}-unreachable` }));
      const error = await completeArrival({ details: { ...details, microchip: '982000999999995' }, exam }).catch((e: unknown) => e);
      expect(error).toMatchObject({ kind: 'upload_failed', message: expect.stringMatching(/storage can't be reached/) });
      expect(api.postApiV1AnimalsByStayIdExam).not.toHaveBeenCalled();
    });
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

import { errorMessage } from '@/api/errors';
import * as sdk from '@/api/generated';
import * as manual from '@/api/manual';
import { refreshMockSessionTokens, revokeMockSession } from '@/auth/mock';
import type { Animal } from '@/domain/types';
import { InspectionError, createDefaultInspection, submitInspection } from '@/features/inspections/inspectionApi';
import { MedicationError, getMedicationDay, listMedicationAnimals, recordAdministration } from '@/features/medication/medicationApi';
import { submitObservation } from '@/features/observations/observationApi';
import { mockDb, resetMockDb } from '@/mock/db';

// API mode on, with the generated SDK and the hand-typed calls mocked: these tests check the requests the
// app sends (against the Postman collection) and how responses and errors are mapped, not the network.
jest.mock('@/api', () => ({ ...jest.requireActual('@/api'), isApiEnabled: () => true }));
jest.mock('@/config/env', () => ({ ...jest.requireActual('@/config/env'), isMockAuthEnabled: () => true }));
jest.mock('@/api/generated', () => ({
  getApiV1Animals: jest.fn(),
  getApiV1AnimalsByStayIdInspections: jest.fn(),
  postApiV1AnimalsByStayIdInspections: jest.fn(),
  postApiV1Observations: jest.fn(),
  postApiV1AuthDevToken: jest.fn(),
  postApiV1AuthRefresh: jest.fn(),
  postApiV1AuthLogout: jest.fn(),
}));
jest.mock('@/api/manual', () => ({
  listMedicationAnimals: jest.fn(),
  getAnimalMedicationDay: jest.fn(),
  recordMedicationAdministration: jest.fn(),
}));

const api = sdk as jest.Mocked<typeof sdk>;
const meds = manual as jest.Mocked<typeof manual>;

function ok<T>(data: T, status = 200) {
  return Promise.resolve({ data, request: {} as Request, response: { ok: true, status } as Response }) as never;
}
function fail(status: number, error: unknown = '') {
  return Promise.resolve({ error, request: {} as Request, response: { ok: false, status } as Response }) as never;
}

const actor = { id: 'u1', name: 'Aisha Rahman', role: 'officer' as const };
const NOW = Date.parse('2026-11-12T01:00:00Z');

/** A backend animal (numeric id) already in the store, as the animal sync leaves it. */
const backendAnimal: Animal = {
  id: '5',
  name: 'Buddy',
  kennel: 'KC1-1',
  species: 'Dog',
  sex: 'Male',
  countryCode: 'SG',
  microchip: '900082000123456',
  dateOfBirth: null,
  arrivalDate: '2026-11-01',
  releaseDate: null,
  status: 'active-monitoring',
  today: { arrivalExam: 'done', amInspection: 'due', pmInspection: 'due' },
};

const medAnimal = { ...backendAnimal, id: 5, kennel: 'KC1-1' };

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
  mockDb.animals.push({ ...backendAnimal, today: { ...backendAnimal.today } });
  api.getApiV1Animals.mockImplementation(() => ok([]));
});

describe('daily inspection (POST /animals/{stayId}/inspections)', () => {
  it('sends the Postman payload and stores the returned record', async () => {
    const input = createDefaultInspection();
    input.systems.eyes = 'abnormal';
    input.food = 'Half';
    api.postApiV1AnimalsByStayIdInspections.mockImplementation((options) =>
      ok(
        {
          id: 101,
          stayId: 5,
          inspectionDate: options.body.inspectionDate,
          session: 'AM',
          mentation: 'Responsive',
          food: 'Half',
          stool: 'Firm',
          urine: 'Yes',
          otherFindings: null,
          systemFindings: [{ id: 1, system: 'eyes', finding: 'abnormal' }],
          recordedBy: 10,
          recordedAt: '2026-11-12T01:00:00Z',
        },
        201,
      ),
    );

    const result = await submitInspection({ animalId: '5', session: 'AM', input, actor, now: NOW });

    const call = api.postApiV1AnimalsByStayIdInspections.mock.calls[0]?.[0];
    expect(call?.path).toEqual({ stayId: 5 });
    expect(call?.body).toEqual({
      session: 'AM',
      inspectionDate: '2026-11-12',
      mentation: 'Responsive',
      food: 'Half',
      stool: 'Firm',
      urine: 'Yes',
      otherFindings: null,
      systemFindings: [
        { system: 'skin', finding: 'normal' },
        { system: 'eyes', finding: 'abnormal' },
        { system: 'nose', finding: 'normal' },
        { system: 'ears', finding: 'normal' },
        { system: 'mouth', finding: 'normal' },
        { system: 'hydration', finding: 'normal' },
        { system: 'cardiorespiratory', finding: 'normal' },
      ],
    });
    expect(result.record).toMatchObject({ id: '101', animalId: '5', recordedBy: 'Aisha Rahman' });
    expect(mockDb.inspections.some((i) => i.id === '101')).toBe(true);
    expect(mockDb.animals.find((a) => a.id === '5')?.today.amInspection).toBe('done');
    // Abnormal findings with no open case still go to AI triage (no backend endpoint for that yet).
    expect(result.sentForReview).toBe(true);
  });

  it('reports the server’s 409 as already recorded', async () => {
    api.postApiV1AnimalsByStayIdInspections.mockImplementation(() => fail(409, { error: 'AM inspection already recorded for this stay on 2026-11-12.' }));
    const error = await submitInspection({ animalId: '5', session: 'AM', input: createDefaultInspection(), actor, now: NOW }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InspectionError);
    expect(error).toMatchObject({ kind: 'already_recorded', message: 'AM inspection already recorded for this stay on 2026-11-12.' });
  });

  it('keeps demo animals on the demo store', async () => {
    // A day after the seeded records, so the demo animal has no inspection yet.
    const later = Date.now() + 3 * 24 * 60 * 60_000;
    await submitInspection({ animalId: 'animal-1', session: 'PM', input: createDefaultInspection(), actor, now: later });
    expect(api.postApiV1AnimalsByStayIdInspections).not.toHaveBeenCalled();
  });
});

describe('observations (POST /observations)', () => {
  const saved = (stayId: number | null) => ({
    id: 50,
    stayId,
    text: 'Lethargic, not eating well.',
    submittedBy: 10,
    submittedAt: '2026-11-12T01:00:00Z',
    source: 'staff',
    status: 'processing',
    aiUnavailable: false,
    readyAt: null,
    media: [],
  });

  it('sends unlinked text with stayId null, and a backend animal by its numeric id', async () => {
    api.postApiV1Observations.mockImplementation((options) => ok(saved(options.body.stayId === null ? null : Number(options.body.stayId)), 201));

    const unlinked = await submitObservation({ animalId: null, text: '  Lethargic, not eating well. ', media: [], actor, now: NOW });
    expect(api.postApiV1Observations).toHaveBeenLastCalledWith({ body: { stayId: null, text: 'Lethargic, not eating well.', media: [] } });
    // The mock AI then runs on the device (instant under Jest): no AI endpoint yet.
    expect(unlinked).toMatchObject({ id: '50', animalId: null, submittedBy: 'Aisha Rahman', source: 'observation' });
    expect(unlinked.ai).not.toBeNull();

    await submitObservation({ animalId: '5', text: 'Lethargic, not eating well.', media: [], actor, now: NOW });
    expect(api.postApiV1Observations).toHaveBeenLastCalledWith({ body: { stayId: 5, text: 'Lethargic, not eating well.', media: [] } });
  });

  it('keeps observations about demo animals on the device', async () => {
    await submitObservation({ animalId: 'animal-2', text: 'Soft stool', media: [], actor, now: NOW });
    expect(api.postApiV1Observations).not.toHaveBeenCalled();
  });
});

describe('medication (Postman "Medication (AQC)")', () => {
  const slot = (time: string, administration: unknown = null) => ({
    slot: `2026-11-12T${time}`,
    scheduleId: 10,
    item: 'Amoxicillin',
    dose: '250mg',
    frequency: '2x daily',
    startDate: '2026-11-10',
    endDate: '2026-11-17',
    time,
    status: administration ? 'administered' : 'due',
    administration,
  });

  it('lists backend animals next to the demo ones, and only demo ones when the server lacks the endpoint', async () => {
    meds.listMedicationAnimals.mockImplementation(() => ok([{ animal: medAnimal, scheduleCount: 2, dueCount: 1, overdueCount: 0 }]));
    const items = await listMedicationAnimals(actor, NOW);
    expect(meds.listMedicationAnimals).toHaveBeenCalledWith('2026-11-12');
    expect(items.find((i) => i.animal.id === '5')).toMatchObject({ scheduleCount: 2, dueCount: 1, animal: { name: 'Buddy' } });
    expect(items.some((i) => !/^\d+$/.test(i.animal.id))).toBe(true);

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    meds.listMedicationAnimals.mockImplementation(() => fail(404));
    const demoOnly = await listMedicationAnimals(actor, NOW);
    expect(demoOnly.every((i) => !/^\d+$/.test(i.animal.id))).toBe(true);
    warn.mockRestore();
  });

  it('maps the day’s slots and caches the schedule for the profile', async () => {
    const given = { id: 5, scheduleId: 10, animalId: 5, slot: '2026-11-12T08:00', administeredAt: 1731394800000, by: 'Officer John', remarks: 'Given with food' };
    meds.getAnimalMedicationDay.mockImplementation(() => ok({ animal: medAnimal, scheduleCount: 1, slots: [slot('18:00'), slot('08:00', given)] }));

    const day = await getMedicationDay(actor, '5', NOW);

    expect(meds.getAnimalMedicationDay).toHaveBeenCalledWith(5, '2026-11-12');
    expect(day?.slots.map((s) => [s.time, s.status, s.scheduleId, s.administration?.id ?? null])).toEqual([
      ['08:00', 'administered', '10', '5'],
      ['18:00', 'due', '10', null],
    ]);
    expect(mockDb.schedules.find((s) => s.id === '10')).toMatchObject({ animalId: '5', item: 'Amoxicillin', times: ['08:00', '18:00'] });
    expect(mockDb.administrations.some((a) => a.id === '5' && a.remarks === 'Given with food')).toBe(true);
  });

  it('records a dose with the Postman body and maps the 409', async () => {
    meds.recordMedicationAdministration.mockImplementation(() =>
      ok({ id: 6, scheduleId: 10, animalId: 5, slot: '2026-11-12T18:00', administeredAt: 1731430800000, by: 'Officer John', remarks: null }, 201),
    );
    const administration = await recordAdministration({ scheduleId: '10', slot: '2026-11-12T18:00', remarks: '  ', actor, now: NOW });
    expect(meds.recordMedicationAdministration).toHaveBeenCalledWith({ scheduleId: 10, slot: '2026-11-12T18:00', remarks: null });
    expect(administration).toMatchObject({ id: '6', animalId: '5', remarks: '' });

    meds.recordMedicationAdministration.mockImplementation(() =>
      fail(409, { error: 'MedicationError', kind: 'already_recorded', message: 'Dose already recorded for this slot.' }),
    );
    const error = await recordAdministration({ scheduleId: '10', slot: '2026-11-12T18:00', remarks: '', actor, now: NOW }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MedicationError);
    expect(error).toMatchObject({ kind: 'already_recorded', message: 'Dose already recorded for this slot.' });
  });
});

describe('mock-session tokens (POST /auth/dev-token, /auth/refresh, /auth/logout)', () => {
  // Header {"alg":"HS256"} and payload {"role":"officer","exp":2000000000}.
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoib2ZmaWNlciIsImV4cCI6MjAwMDAwMDAwMH0.sig';
  const issued = (refresh: string) => ({ access_token: jwt, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600 });

  it('refreshes with the backend refresh token and revokes it on sign-out', async () => {
    api.postApiV1AuthRefresh.mockImplementation(() => ok(issued('r2')));
    const next = await refreshMockSessionTokens('officer', { accessToken: 'old', refreshToken: 'r1', expiresAt: 0 });
    expect(api.postApiV1AuthRefresh).toHaveBeenCalledWith({ body: { refresh_token: 'r1' } });
    expect(next).toMatchObject({ accessToken: jwt, refreshToken: 'r2', expiresAt: 2_000_000_000_000 });

    api.postApiV1AuthLogout.mockImplementation(() => ok({}, 204));
    await revokeMockSession(next);
    expect(api.postApiV1AuthLogout).toHaveBeenCalledWith({ body: { refresh_token: 'r2' } });
  });

  it('asks for a new dev token when there is no backend refresh token or it is rejected', async () => {
    api.postApiV1AuthDevToken.mockImplementation(() => ok(issued('')));
    const fromMock = await refreshMockSessionTokens('contractor', { accessToken: 'old', refreshToken: 'mock-refresh-contractor', expiresAt: 0 });
    expect(api.postApiV1AuthRefresh).not.toHaveBeenCalled();
    expect(api.postApiV1AuthDevToken).toHaveBeenCalledWith({ body: { userId: 2, userType: 'aqc_staff', aqcStaffRole: 'contractor' } });
    // The dev server returns an empty refresh token: the mock one stays, so nothing is revoked on sign-out.
    expect(fromMock.refreshToken).toBe('mock-refresh-contractor');
    await revokeMockSession(fromMock);
    expect(api.postApiV1AuthLogout).not.toHaveBeenCalled();

    api.postApiV1AuthRefresh.mockImplementation(() => fail(401, { error: 'Refresh token is invalid or expired.' }));
    await refreshMockSessionTokens('officer', { accessToken: 'old', refreshToken: 'r1', expiresAt: 0 });
    expect(api.postApiV1AuthDevToken).toHaveBeenCalledTimes(2);
  });
});

describe('API error messages', () => {
  it('prefers the sentence over the code in every error shape', () => {
    expect(errorMessage({ error: 'MedicationError', kind: 'already_recorded', message: 'Dose already recorded for this slot.' }, 409)).toBe(
      'Dose already recorded for this slot.',
    );
    expect(errorMessage({ error: 'validation-error', message: "Platform must be 'android' or 'ios'.", field: 'platform' }, 400)).toBe(
      "Platform must be 'android' or 'ios'.",
    );
    expect(errorMessage({ error: 'Text is required.' }, 400)).toBe('Text is required.');
  });
});

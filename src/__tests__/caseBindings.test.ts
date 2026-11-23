import * as sdk from '@/api/generated';
import type { CaseDetailResponse, ObservationResponse } from '@/api/generated';
import type { Animal } from '@/domain/types';
import { getAnimalProfile, listRecentAnimalIds } from '@/features/animals/animalsApi';
import { CaseError, addFollowUp, closeCase, getCase, listCases } from '@/features/cases/casesApi';
import { ObservationError, confirmRouting, getObservation, listReviewQueue } from '@/features/observations/observationApi';
import { mockDb, mockSigns, resetMockDb } from '@/mock/db';
import { ScopeError } from '@/mock/scope';

// API mode on, with the generated SDK mocked: checks the requests sent for the Postman "Case Management",
// "Observation" (AI result, routing, review queue) and "Animal Health Timeline" endpoints, and the mapping.
jest.mock('@/api', () => ({ ...jest.requireActual('@/api'), isApiEnabled: () => true }));
jest.mock('@/api/generated', () => ({
  getApiV1Animals: jest.fn(),
  getApiV1AnimalsById: jest.fn(),
  getApiV1AnimalsByStayIdExam: jest.fn(),
  getApiV1AnimalsByStayIdInspections: jest.fn(),
  getApiV1AnimalsByStayIdObservations: jest.fn(),
  getApiV1AnimalsByStayIdMedication: jest.fn(),
  getApiV1MasterDataVetSpecialisations: jest.fn(),
  getApiV1Cases: jest.fn(),
  getApiV1CasesByCaseId: jest.fn(),
  patchApiV1CasesByCaseId: jest.fn(),
  postApiV1CasesByCaseIdClose: jest.fn(),
  getApiV1ObservationsById: jest.fn(),
  getApiV1ObservationsByIdAiResult: jest.fn(),
  postApiV1ObservationsByIdRoute: jest.fn(),
  getApiV1ObservationsReviewQueue: jest.fn(),
  getApiV1AnimalsByStayIdTimeline: jest.fn(),
  getApiV1AnimalsByStayIdSummary: jest.fn(),
  getApiV1MeRecentAnimals: jest.fn(),
}));

const api = sdk as jest.Mocked<typeof sdk>;

function ok<T>(data: T, status = 200) {
  return Promise.resolve({ data, request: {} as Request, response: { ok: true, status } as Response }) as never;
}
function fail(status: number, error: unknown = '') {
  return Promise.resolve({ error, request: {} as Request, response: { ok: false, status } as Response }) as never;
}

const officer = { id: '10', name: 'Officer John', role: 'officer' as const };

const backendAnimal: Animal = {
  id: '1',
  name: 'Buddy',
  kennel: 'A-01',
  species: 'Dog',
  sex: 'Male',
  countryCode: 'SG',
  microchip: '123456789012345',
  dateOfBirth: '2020-01-15',
  arrivalDate: '2026-11-01',
  releaseDate: null,
  status: 'active-monitoring',
  today: { arrivalExam: 'done', amInspection: 'done', pmInspection: 'due' },
};

/** The Postman "Get Case" example. */
function caseDetail(overrides: Partial<CaseDetailResponse['healthCase']> = {}): CaseDetailResponse {
  return {
    healthCase: {
      id: 'C-2026-0901',
      animalId: 1,
      finding: 'Animal showing signs of lethargy and loss of appetite.',
      system: 'GI',
      status: 'open',
      openedAt: 1731394800000,
      updatedAt: 1731394800000,
      assigneeId: 5,
      followUps: [{ id: 1, text: 'Check food intake tomorrow AM', dueDate: '2026-11-13', done: false }],
      events: [{ id: 1, at: 1731394800000, kind: 'opened', title: 'Case opened', by: 'Officer John', detail: null, observationId: 50, inspectionId: null }],
      evidence: [],
      closedAt: null,
      closeReason: null,
      reopenedAt: null,
      ...overrides,
    },
    animal: { ...backendAnimal, id: 1 },
    assignee: { id: 5, name: 'Officer Jane', role: 'officer' },
    summary: 'Open GI case — lethargy and anorexia since 2026-11-11.',
    pendingObservationId: null,
  };
}

const observation50: ObservationResponse = {
  id: 50,
  stayId: 1,
  text: 'Animal appears lethargic.',
  submittedBy: 10,
  submittedAt: '2026-11-12T09:00:00Z',
  source: 'staff',
  status: 'processing',
  aiUnavailable: false,
  readyAt: null,
  media: [],
};

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
  mockDb.animals.push({ ...backendAnimal, today: { ...backendAnimal.today } });
  // Animal sync and per-animal records: nothing extra on the server.
  api.getApiV1Animals.mockReturnValue(ok([]));
  api.getApiV1AnimalsByStayIdExam.mockReturnValue(fail(404));
  api.getApiV1AnimalsByStayIdInspections.mockReturnValue(ok([]));
  api.getApiV1AnimalsByStayIdObservations.mockReturnValue(ok([]));
  api.getApiV1AnimalsByStayIdMedication.mockReturnValue(fail(404));
  api.getApiV1MasterDataVetSpecialisations.mockReturnValue(ok([]));
  api.getApiV1Cases.mockReturnValue(ok([]));
  api.getApiV1ObservationsReviewQueue.mockReturnValue(ok([]));
  api.getApiV1ObservationsByIdAiResult.mockReturnValue(fail(404, { error: 'AI result for observation 50 is not yet available.' }));
});

describe('cases (Postman "Case Management (AQC)")', () => {
  it('lists the server’s cases next to the demo ones and keeps them in the store', async () => {
    const { pendingObservationId: _p, summary: _s, ...item } = caseDetail();
    api.getApiV1Cases.mockReturnValue(ok([{ ...item, overdueFollowUps: 1 }]));
    const list = await listCases(officer);
    const backendCase = list.find((c) => c.healthCase.id === 'C-2026-0901' && c.animal.id === '1');
    expect(backendCase).toMatchObject({
      healthCase: { animalId: '1', system: 'GI', status: 'open', assigneeId: '5', openedAt: 1731394800000 },
      assignee: { id: '5', name: 'Officer Jane', role: 'officer' },
      overdueFollowUps: 1,
    });
    expect(backendCase?.healthCase.events[0]).toMatchObject({ kind: 'opened', observationId: '50' });
    // Demo cases (demo animals) are still listed; the store holds the server's case for other screens.
    expect(list.some((c) => !/^\d+$/.test(c.animal.id))).toBe(true);
    expect(mockDb.cases.some((c) => c.animalId === '1')).toBe(true);
  });

  it('loads one case by number, with null for 404 and a scope error for 403', async () => {
    api.getApiV1CasesByCaseId.mockReturnValueOnce(ok(caseDetail()));
    const detail = await getCase(officer, 'C-2026-0901');
    expect(api.getApiV1CasesByCaseId).toHaveBeenCalledWith({ path: { caseId: 'C-2026-0901' } });
    expect(detail).toMatchObject({ summary: expect.stringMatching(/Open GI case/), actions: { note: false, markReviewed: false, reopen: false } });

    api.getApiV1CasesByCaseId.mockReturnValueOnce(fail(404, { error: "Health case 'C-2099-0001' not found." }));
    expect(await getCase(officer, 'C-2099-0001')).toBeNull();
    api.getApiV1CasesByCaseId.mockReturnValueOnce(fail(403, { error: 'Case is not within your contractor scope.' }));
    await expect(getCase(officer, 'C-2099-0002')).rejects.toBeInstanceOf(ScopeError);
  });

  it('adds a follow-up by sending the whole list and keeping the assignee', async () => {
    api.getApiV1CasesByCaseId.mockReturnValue(ok(caseDetail()));
    api.patchApiV1CasesByCaseId.mockReturnValue(ok(caseDetail()));
    await addFollowUp({ caseId: 'C-2026-0901', text: '  Recheck stool  ', dueDate: '2026-11-14', actor: officer });
    expect(api.patchApiV1CasesByCaseId).toHaveBeenCalledWith({
      path: { caseId: 'C-2026-0901' },
      body: {
        assigneeId: '5',
        followUps: [
          { id: '1', text: 'Check food intake tomorrow AM', dueDate: '2026-11-13', done: false },
          { id: null, text: 'Recheck stool', dueDate: '2026-11-14', done: false },
        ],
      },
    });
  });

  it('closes with the reason and note, and shows the server’s 409', async () => {
    api.postApiV1CasesByCaseIdClose.mockReturnValueOnce(ok(caseDetail({ status: 'closed', closeReason: 'Resolved' })));
    await closeCase({ caseId: 'C-2026-0901', reason: 'Resolved', note: ' Eating normally. ', actor: officer });
    expect(api.postApiV1CasesByCaseIdClose).toHaveBeenCalledWith({ path: { caseId: 'C-2026-0901' }, body: { reason: 'Resolved', note: 'Eating normally.' } });

    api.postApiV1CasesByCaseIdClose.mockReturnValueOnce(fail(409, { error: 'Case is already closed.' }));
    const error = await closeCase({ caseId: 'C-2026-0901', reason: 'Resolved', note: '', actor: officer }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CaseError);
    expect(error).toMatchObject({ kind: 'invalid_transition', message: 'Case is already closed.' });
  });
});

describe('observation AI result and routing', () => {
  it('uses the server’s AI result once it has one', async () => {
    api.getApiV1ObservationsById.mockReturnValue(ok(observation50));
    api.getApiV1ObservationsByIdAiResult.mockReturnValue(
      ok({
        observationId: 50,
        matchedStayId: 1,
        matchConfidence: 0.95,
        foodExtracted: 'none',
        stoolExtracted: null,
        onsetDate: '2026-11-11',
        severity: 'moderate',
        suggestedAction: 'new-case',
        suggestedCaseId: null,
        rationale: 'Animal shows signs consistent with GI issue.',
        signs: [{ code: mockSigns[0]!.code }, { code: 'tail_chasing' }],
      }),
    );
    const detail = await getObservation('50');
    expect(detail?.observation).toMatchObject({ status: 'awaiting-confirmation', animalId: '1' });
    expect(detail?.observation.ai).toMatchObject({
      match: { animalId: '1', confidence: 0.95, selectedByUser: true },
      extraction: { food: 'None', stool: null, onsetDate: '2026-11-11', severity: 'moderate' },
      suggestion: { action: 'new-case', caseId: null },
    });
    expect(detail?.observation.ai?.extraction.signs.map((s) => s.label)).toEqual([mockSigns[0]!.label, 'Tail chasing']);
  });

  it('sends the decision to POST /observations/{id}/route and returns the new case number', async () => {
    api.getApiV1ObservationsById.mockReturnValue(ok(observation50));
    await getObservation('50');
    const signs = mockSigns.filter((s) => s.system === 'GI').slice(0, 2);
    api.postApiV1ObservationsByIdRoute.mockReturnValueOnce(ok({ observation: { ...observation50, status: 'routed' }, action: 'new-case', caseId: 42, caseNumber: 'C-2026-0901' }));
    const result = await confirmRouting({ observationId: '50', animalId: '1', signs, action: 'new-case', caseId: null, actor: officer });
    expect(api.postApiV1ObservationsByIdRoute).toHaveBeenCalledWith({
      path: { id: 50 },
      body: {
        action: 'new-case',
        stayId: 1,
        caseId: null,
        finding: `GI upset — ${signs.map((s) => s.label.toLowerCase()).join(', ')}`,
        clinicalSystem: 'GI',
        confirmedSigns: signs.map((s) => s.code),
      },
    });
    expect(result).toEqual({ caseId: 'C-2026-0901', animalId: '1' });
    expect(mockDb.observations.find((o) => o.id === '50')).toMatchObject({ status: 'routed', routing: { action: 'new-case', caseId: 'C-2026-0901' } });
  });

  it('shows the server’s rejection', async () => {
    api.getApiV1ObservationsById.mockReturnValue(ok(observation50));
    await getObservation('50');
    api.postApiV1ObservationsByIdRoute.mockReturnValueOnce(fail(403, { error: 'Only officers and supervisors can confirm routing.' }));
    const error = await confirmRouting({ observationId: '50', animalId: '1', signs: [], action: 'timeline-only', caseId: null, actor: officer }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ObservationError);
    expect(error).toMatchObject({ kind: 'rejected', message: 'Only officers and supervisors can confirm routing.' });
  });

  it('lists the server’s review queue in AI triage', async () => {
    api.getApiV1ObservationsReviewQueue.mockReturnValue(
      ok([
        {
          id: 51,
          text: 'Animal appears lethargic.',
          submittedAt: '2026-11-12T09:00:00Z',
          status: 'review',
          aiUnavailable: false,
          submittedBy: { id: 10, name: 'Officer John' },
          animal: { stayId: 1, name: 'Buddy', species: 'Dog', kennelCode: 'A-01' },
          aiSuggestion: { suggestedAction: 'new-case', severity: 'moderate', signs: ['lethargy'] },
        },
      ]),
    );
    api.getApiV1ObservationsByIdAiResult.mockReturnValue(
      ok({ observationId: 51, matchedStayId: 1, matchConfidence: 0.4, foodExtracted: null, stoolExtracted: null, onsetDate: null, severity: 'moderate', suggestedAction: 'new-case', suggestedCaseId: null, rationale: null, signs: [] }),
    );
    const queue = await listReviewQueue();
    const item = queue.find((q) => q.observation.id === '51');
    expect(item).toMatchObject({ reason: 'low-confidence', guess: { id: '1' }, observation: { submittedBy: 'Officer John', status: 'review' } });
  });
});

describe('animal health timeline (Postman "Animal Health Timeline (AQC)")', () => {
  it('shows the server’s timeline and cited summary on the profile', async () => {
    api.getApiV1AnimalsByStayIdTimeline.mockReturnValue(
      ok({
        stayId: 1,
        name: 'Buddy',
        species: 'Dog',
        kennelCode: 'A-01',
        status: 'active-monitoring',
        arrivalDate: '2026-11-01',
        entries: [
          { id: 101, kind: 'inspection', occurredAt: '2026-11-12T08:00:00Z', title: 'AM Inspection', detail: 'Mentation: Alert. Food: Full. Stool: Firm.', subLabel: 'AM', referenceId: 101 },
          { id: 1, kind: 'arrival-exam', occurredAt: '2026-11-01T08:30:00Z', title: 'Arrival Exam', detail: 'Weight: 12.5 kg.', subLabel: null, referenceId: 1 },
        ],
      }),
    );
    api.getApiV1AnimalsByStayIdSummary.mockReturnValue(
      ok({
        updatedAt: '2026-11-12T06:00:00Z',
        statements: [
          { text: 'Buddy arrived on 2026-11-01. [1]', citations: [{ refIndex: 1, sourceKind: 'arrival-exam', sourceId: '1', label: 'Arrival Exam 2026-11-01' }] },
          { text: 'Inspections normal. [2]', citations: [{ refIndex: 2, sourceKind: 'inspection', sourceId: '101', label: 'AM Inspection 2026-11-12' }] },
        ],
      }),
    );
    const profile = await getAnimalProfile(officer, '1');
    expect(api.getApiV1AnimalsByStayIdTimeline).toHaveBeenCalledWith({ path: { stayId: 1 } });
    expect(profile?.timeline.map((e) => [e.kind, e.id, e.session])).toEqual([
      ['inspection', '101', 'AM'],
      ['exam', '1', null],
    ]);
    expect(profile?.summary.statements).toEqual([
      { text: 'Buddy arrived on 2026-11-01.', refs: [1] },
      { text: 'Inspections normal.', refs: [2] },
    ]);
    expect(profile?.summary.sources).toEqual([
      { id: '1', label: 'Arrival Exam 2026-11-01', kind: 'exam' },
      { id: '101', label: 'AM Inspection 2026-11-12', kind: 'inspection' },
    ]);
  });

  it('shows no summary while the server has none (204)', async () => {
    api.getApiV1AnimalsByStayIdTimeline.mockReturnValue(ok({ stayId: 1, name: 'Buddy', species: 'Dog', kennelCode: 'A-01', status: 'active-monitoring', arrivalDate: '2026-11-01', entries: [] }));
    api.getApiV1AnimalsByStayIdSummary.mockReturnValue(ok(undefined, 204));
    const profile = await getAnimalProfile(officer, '1');
    expect(profile?.summary.statements).toEqual([]);
  });

  it('offers picker picks first, then the profiles viewed most recently', async () => {
    mockDb.recentAnimalIds = ['animal-2'];
    api.getApiV1MeRecentAnimals.mockReturnValue(
      ok([
        { stayId: 1, name: 'Buddy', species: 'Dog', kennelCode: 'A-01', status: 'active-monitoring', viewedAt: '2026-11-12T09:05:00Z' },
        { stayId: 7, name: 'Coco', species: 'Cat', kennelCode: 'A-02', status: 'active-monitoring', viewedAt: '2026-11-12T09:00:00Z' },
        { stayId: 8, name: 'Max', species: 'Dog', kennelCode: 'A-03', status: 'active-monitoring', viewedAt: '2026-11-12T08:00:00Z' },
      ]),
    );
    expect(await listRecentAnimalIds()).toEqual(['animal-2', '1', '7']);
  });
});

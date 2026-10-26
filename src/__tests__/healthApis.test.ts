import type { Actor } from '@/domain/types';
import { filterAnimals, getAnimalProfile, listAnimals } from '@/features/animals/animalsApi';
import { CaseError, addNote, closeCase, filterCases, listCases, reopenCase } from '@/features/cases/casesApi';
import { InspectionError, createDefaultInspection, getInspectionBoard, submitInspection } from '@/features/inspections/inspectionApi';
import { MedicationError, buildDoseSlots, recordAdministration } from '@/features/medication/medicationApi';
import { confirmRouting, listReviewQueue, submitObservation } from '@/features/observations/observationApi';
import { mockDb, resetMockDb } from '@/mock/db';
import { msAt, todayIso } from '@/utils/dates';

const officer: Actor = { id: 'officer-1', name: 'Test Officer', role: 'officer' };
const contractor: Actor = { id: 'contractor-1', name: 'Test Contractor', role: 'contractor' };

beforeEach(() => resetMockDb());

describe('animals (FE-006, FE-014)', () => {
  it('FE-006: contractors only see their assigned kennels; search matches kennel, name or chip', async () => {
    const all = await listAnimals(officer);
    const scoped = await listAnimals(contractor);
    expect(all).toHaveLength(8);
    expect(scoped.every((item) => item.animal.kennel.startsWith('KC2-'))).toBe(true);
    expect(scoped.some((item) => item.animal.kennel === 'KC1-1')).toBe(false);
    expect(filterAnimals(all, 'kc2-2').map((i) => i.animal.name)).toEqual(['Yang Yang']);
    expect(filterAnimals(all, 'mochi')).toHaveLength(1);
    expect(filterAnimals(all, '0005').map((i) => i.animal.name)).toEqual(['Luna']);
  });

  it('FE-014: the profile timeline mixes record types, newest first, and the summary cites sources', async () => {
    const profile = await getAnimalProfile(officer, 'animal-2');
    const kinds = new Set(profile?.timeline.map((e) => e.kind));
    expect([...kinds]).toEqual(expect.arrayContaining(['inspection', 'observation', 'medication', 'case', 'exam']));
    const times = profile?.timeline.map((e) => e.at) ?? [];
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(profile?.summary.statements[0]?.text).toMatch(/GI upset since/);
    expect(profile?.summary.statements.every((s) => s.refs.every((r) => r >= 1 && r <= (profile?.summary.sources.length ?? 0)))).toBe(true);
    expect(profile?.summary.sources.some((c) => c.kind === 'case' && c.id === 'C-2026-0142')).toBe(true);
  });
});

describe('daily inspection (FE-009, BE-011)', () => {
  it('records one AM inspection per animal per day and updates today’s status', async () => {
    const result = await submitInspection({ animalId: 'animal-3', session: 'AM', input: createDefaultInspection(), actor: officer });
    expect(result).toMatchObject({ linkedCaseId: null, sentForReview: false });
    expect(mockDb.animals.find((a) => a.id === 'animal-3')?.today.amInspection).toBe('done');
    await expect(
      submitInspection({ animalId: 'animal-3', session: 'AM', input: createDefaultInspection(), actor: officer }),
    ).rejects.toBeInstanceOf(InspectionError);
    const board = await getInspectionBoard(officer, 'AM');
    expect(board.items.find((i) => i.animal.id === 'animal-3')?.record).not.toBeNull();
  });

  it('links abnormal findings to an open case for the same system, otherwise sends them for review', async () => {
    const gi = { ...createDefaultInspection(), stool: 'Loose' as const };
    const linked = await submitInspection({ animalId: 'animal-2', session: 'PM', input: gi, actor: officer });
    expect(linked.linkedCaseId).toBe('C-2026-0142');
    expect(mockDb.cases.find((c) => c.id === 'C-2026-0142')?.events.at(-1)?.title).toBe('PM inspection · Stool: Loose');

    const queued = await submitInspection({ animalId: 'animal-3', session: 'AM', input: { ...gi, otherFindings: 'Very quiet' }, actor: officer });
    expect(queued.sentForReview).toBe(true);
    expect(mockDb.observations.at(-1)).toMatchObject({ source: 'inspection', status: 'review', animalId: 'animal-3' });
  });
});

describe('medication (FE-013, BE-015)', () => {
  const today = todayIso();
  const noon = msAt(today, '12:00');
  beforeEach(() => {
    mockDb.schedules.push({ id: 'med-test', animalId: 'animal-3', item: 'Vitamin paste', dose: '2 g', times: ['08:00', '11:30', '15:00'], startDate: today, endDate: today });
  });

  it('shows overdue, due and upcoming doses', () => {
    const slots = buildDoseSlots('animal-3', noon);
    expect(slots.map((s) => [s.time, s.status])).toEqual([
      ['08:00', 'overdue'],
      ['11:30', 'due'],
      ['15:00', 'upcoming'],
    ]);
  });

  it('captures time and officer automatically and prevents double-recording', async () => {
    const admin = await recordAdministration({ scheduleId: 'med-test', slot: `${today}T11:30`, remarks: ' with food ', actor: officer, now: noon });
    expect(admin).toMatchObject({ by: 'Test Officer', administeredAt: noon, remarks: 'with food' });
    expect(buildDoseSlots('animal-3', noon).find((s) => s.time === '11:30')?.status).toBe('administered');
    await expect(
      recordAdministration({ scheduleId: 'med-test', slot: `${today}T11:30`, remarks: '', actor: officer, now: noon }),
    ).rejects.toMatchObject({ kind: 'already_recorded' });
    await expect(
      recordAdministration({ scheduleId: 'med-test', slot: `${today}T15:00`, remarks: '', actor: officer, now: noon }),
    ).rejects.toBeInstanceOf(MedicationError);
  });
});

describe('cases (FE-015, FE-016, BE-017)', () => {
  it('FE-015: filters combine; "Assigned to me" uses the current user', async () => {
    const items = await listCases(officer);
    expect(filterCases(items, new Set(['open']), officer.id, '')).toHaveLength(3);
    expect(filterCases(items, new Set(['review']), officer.id, '').map((i) => i.healthCase.id)).toEqual(['C-2026-0142']);
    expect(filterCases(items, new Set(['mine']), officer.id, '')).toHaveLength(0);
    expect(filterCases(items, new Set(), officer.id, 'luna').map((i) => i.healthCase.id)).toEqual(['C-2026-0121']);
  });

  it('FE-016: close requires a reason and an officer; reopen keeps the full history', async () => {
    await expect(closeCase({ caseId: 'C-2026-0138', reason: '', note: '', actor: officer })).rejects.toMatchObject({ kind: 'reason_required' });
    await expect(closeCase({ caseId: 'C-2026-0138', reason: 'Resolved', note: '', actor: contractor })).rejects.toBeInstanceOf(CaseError);

    await addNote({ caseId: 'C-2026-0138', text: 'Eating better', actor: officer });
    await closeCase({ caseId: 'C-2026-0138', reason: 'Resolved', note: '', actor: officer });
    const closed = mockDb.cases.find((c) => c.id === 'C-2026-0138');
    expect(closed).toMatchObject({ status: 'closed', closeReason: 'Resolved' });
    const eventsBefore = closed?.events.length ?? 0;

    await reopenCase({ caseId: 'C-2026-0138', actor: officer });
    const reopened = mockDb.cases.find((c) => c.id === 'C-2026-0138');
    expect(reopened?.status).toBe('open');
    expect(reopened?.events.length).toBe(eventsBefore + 1);
    expect(reopened?.events.some((e) => e.kind === 'note' && e.detail === 'Eating better')).toBe(true);
  });
});

describe('observations and AI routing (FE-010, FE-012, FE-017, BE-018)', () => {
  it('FE-010: text alone is enough; a confident match waits for confirmation', async () => {
    const observation = await submitObservation({ animalId: null, text: 'KC2-3 Mochi vomited after breakfast', media: [], actor: officer });
    expect(observation.status).toBe('awaiting-confirmation');
    expect(observation.ai?.match?.animalId).toBe('animal-3');
    expect(observation.ai?.suggestion.action).toBe('new-case');
  });

  it('FE-012: Confirm & Route creates a case and records who confirmed', async () => {
    const observation = await submitObservation({ animalId: null, text: 'KC2-3 Mochi vomited after breakfast', media: [{ id: 'm1', kind: 'photo' }], actor: officer });
    const signs = observation.ai?.extraction.signs ?? [];
    const result = await confirmRouting({ observationId: observation.id, animalId: 'animal-3', signs, action: 'new-case', caseId: null, actor: officer });
    const created = mockDb.cases.find((c) => c.id === result.caseId);
    expect(created).toMatchObject({ animalId: 'animal-3', status: 'open', system: 'GI' });
    expect(created?.evidence).toHaveLength(1);
    expect(mockDb.observations.find((o) => o.id === observation.id)?.routing?.confirmedBy).toBe('Test Officer');
  });

  it('FE-017: unmatched observations queue for review and leave the queue once triaged', async () => {
    const before = await listReviewQueue();
    expect(before).toHaveLength(4);
    const item = before.find((i) => i.observation.id === 'obs-402');
    await confirmRouting({ observationId: 'obs-402', animalId: 'animal-4', signs: item?.observation.ai?.extraction.signs ?? [], action: 'update-case', caseId: 'C-2026-0138', actor: officer });
    const after = await listReviewQueue();
    expect(after.map((i) => i.observation.id)).not.toContain('obs-402');
    expect(mockDb.cases.find((c) => c.id === 'C-2026-0138')?.events.at(-1)?.observationId).toBe('obs-402');
  });

  it('BE-018: reopening a closed case keeps its earlier events', async () => {
    const before = mockDb.cases.find((c) => c.id === 'C-2026-0107')?.events.length ?? 0;
    const observation = await submitObservation({ animalId: 'animal-1', text: 'Scratching again', media: [], actor: officer });
    await confirmRouting({ observationId: observation.id, animalId: 'animal-1', signs: observation.ai?.extraction.signs ?? [], action: 'reopen-case', caseId: 'C-2026-0107', actor: officer });
    const reopened = mockDb.cases.find((c) => c.id === 'C-2026-0107');
    expect(reopened?.status).toBe('open');
    expect(reopened?.events.length).toBe(before + 1);
  });
});
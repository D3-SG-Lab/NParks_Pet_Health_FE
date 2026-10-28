/**
 * Exports the mock API responses to docs/api-mock/ as JSON, for the backend team to use as the
 * response contract. Every file is produced by calling the real feature *Api.ts functions the screens
 * use, so the JSON is exactly what the UI renders today.
 *
 * Run with `npm run mock:export`. It runs under Jest (the jest-expo preset resolves the `@/` alias
 * and React Native modules) with the clock frozen at EXPORT_NOW in Asia/Singapore, so the output is
 * the same on every run. It is not part of `npm test`.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { Actor, InspectionInput, TimelineEntry } from '@/domain/types';

/** Mon 26 Oct 2026, 10:30 Singapore time: AM session, after the 08:00 due time. */
const EXPORT_NOW = Date.UTC(2026, 9, 26, 2, 30);

const OUT_DIR = path.join(__dirname, '..', 'docs', 'api-mock');

const OFFICER: Actor = { id: 'staff-3', name: 'Aisha Rahman', role: 'officer' };
const CONTRACTOR: Actor = { id: 'staff-5', name: 'Siti Hassan', role: 'contractor' };

interface Example {
  endpoint: string;
  description: string;
  role?: Actor['role'];
  request?: unknown;
  response: unknown;
}

const written: string[] = [];

function write(file: string, example: Example) {
  const target = path.join(OUT_DIR, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(example, null, 2)}\n`);
  written.push(file);
}

/** Calls a mutation that is expected to fail and returns the error the UI shows. */
async function errorOf(run: () => Promise<unknown>): Promise<{ error: string; kind: string | null; message: string }> {
  try {
    await run();
  } catch (e) {
    const error = e as Error & { kind?: string };
    return { error: error.name, kind: error.kind ?? null, message: error.message };
  }
  throw new Error('Expected the call to fail');
}

jest.setTimeout(60_000);

describe('export mock API responses', () => {
  beforeAll(() => {
    // Freeze the clock only: the mock latency still uses real (zero-delay) timers under Jest.
    jest.useFakeTimers({ now: EXPORT_NOW, doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  });

  it('writes docs/api-mock', async () => {
    // Loaded after the clock is frozen: the seed records are generated relative to "now" on import.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const db = require('@/mock/db') as typeof import('@/mock/db');
    const animals = require('@/features/animals/animalsApi') as typeof import('@/features/animals/animalsApi');
    const arrivals = require('@/features/arrivals/arrivalApi') as typeof import('@/features/arrivals/arrivalApi');
    const cases = require('@/features/cases/casesApi') as typeof import('@/features/cases/casesApi');
    const inspections = require('@/features/inspections/inspectionApi') as typeof import('@/features/inspections/inspectionApi');
    const medication = require('@/features/medication/medicationApi') as typeof import('@/features/medication/medicationApi');
    const notifications = require('@/features/notifications/notificationsApi') as typeof import('@/features/notifications/notificationsApi');
    const observations = require('@/features/observations/observationApi') as typeof import('@/features/observations/observationApi');
    const operations = require('@/features/operations/operationsApi') as typeof import('@/features/operations/operationsApi');
    const sync = require('@/features/sync/syncApi') as typeof import('@/features/sync/syncApi');
    /* eslint-enable @typescript-eslint/no-require-imports */

    // Regenerate everything except the hand-written README.
    if (fs.existsSync(OUT_DIR)) {
      for (const entry of fs.readdirSync(OUT_DIR)) {
        if (entry !== 'README.md') fs.rmSync(path.join(OUT_DIR, entry), { recursive: true, force: true });
      }
    }
    db.resetMockDb();

    // --- Reference data ---------------------------------------------------------------------------
    write('reference/kennels.json', { endpoint: 'GET /kennels', description: 'Kennel picker on New Arrival, with the current occupant.', response: await arrivals.listKennelOptions() });
    write('reference/vets.json', { endpoint: 'GET /vets', description: 'Examining vet picker on Arrival Exam.', response: await arrivals.listVets() });
    write('reference/countries.json', { endpoint: 'GET /countries', description: 'Country of origin picker on New Arrival.', response: await arrivals.listCountries() });
    write('reference/clinical-signs.json', { endpoint: 'GET /clinical-signs', description: 'AQC symptom taxonomy used by the AI extraction and the sign editor on Confirm AI result.', response: await observations.listSigns() });
    write('reference/assignable-staff.json', { endpoint: 'GET /staff/assignable', description: 'Case assignee picker (officer-side staff only).', role: 'officer', response: await cases.listAssignableStaff(OFFICER) });

    // --- Operations ---------------------------------------------------------------------------------
    for (const actor of [OFFICER, CONTRACTOR]) {
      write(`operations/summary.${actor.role}.json`, {
        endpoint: 'GET /operations/summary',
        description: 'Operations tab: today\'s counts, review count and alerts. Scoped to the caller\'s kennels.',
        role: actor.role,
        response: await operations.getOperationsSummary(actor, EXPORT_NOW),
      });
    }

    // --- Animals ------------------------------------------------------------------------------------
    for (const actor of [OFFICER, CONTRACTOR]) {
      write(`animals/list.${actor.role}.json`, {
        endpoint: 'GET /animals',
        description: 'Animal picker: active animals in kennel order with the current-session inspection status. Contractors only get their assigned kennels.',
        role: actor.role,
        response: await animals.listAnimals(actor, EXPORT_NOW),
      });
    }
    write('animals/recent.json', { endpoint: 'GET /me/recent-animals', description: 'Animal IDs most recently picked by this user, newest first (max 3).', response: await animals.listRecentAnimalIds() });

    const list = await animals.listAnimals(OFFICER, EXPORT_NOW);
    const unwell = list.find((item) => item.unwell);
    if (!unwell) throw new Error('The seed data needs an animal with an open case');
    const profile = await animals.getAnimalProfile(OFFICER, unwell.animal.id, EXPORT_NOW);
    write('animals/profile.json', {
      endpoint: 'GET /animals/{animalId}/profile',
      description: 'Animal Profile: animal, 30-day timeline (newest first), AI summary with citations, cases and today\'s checks.',
      role: 'officer',
      request: { animalId: unwell.animal.id },
      response: profile,
    });

    const contractorOnly = (await animals.listAnimals(CONTRACTOR, EXPORT_NOW)).map((item) => item.animal.id);
    const outOfScope = list.find((item) => !contractorOnly.includes(item.animal.id));
    if (outOfScope) {
      write('animals/profile.error-out-of-scope.json', {
        endpoint: 'GET /animals/{animalId}/profile',
        description: 'A contractor opening an animal outside their kennels. Suggested status: 403.',
        role: 'contractor',
        request: { animalId: outOfScope.animal.id },
        response: await errorOf(() => animals.getAnimalProfile(CONTRACTOR, outOfScope.animal.id, EXPORT_NOW)),
      });
    }

    // Record detail for one timeline entry of each kind (tapping a timeline row or a summary citation).
    const allEntries: TimelineEntry[] = db.mockDb.animals.flatMap((a) => animals.buildTimeline(a.id));
    for (const kind of ['inspection', 'observation', 'medication', 'exam', 'case'] as const) {
      const entry = allEntries.find((e) => e.kind === kind && (kind !== 'case' || e.caseId));
      if (!entry) continue;
      write(`animals/record-detail.${kind}.json`, {
        endpoint: 'GET /records/{kind}/{id}',
        description: `Record detail sheet for a ${kind} timeline entry.`,
        request: { kind, id: kind === 'case' ? entry.caseId : entry.id },
        response: await animals.getRecordDetail(entry),
      });
    }

    // --- Daily inspection ---------------------------------------------------------------------------
    for (const actor of [OFFICER, CONTRACTOR]) {
      for (const session of ['AM', 'PM'] as const) {
        write(`inspections/board.${session}.${actor.role}.json`, {
          endpoint: 'GET /inspections/board?session={AM|PM}&date={YYYY-MM-DD}',
          description: 'Daily Inspection tab: animals in scope with today\'s record for the session (null = still due).',
          role: actor.role,
          request: { session, date: '2026-10-26' },
          response: await inspections.getInspectionBoard(actor, session, EXPORT_NOW),
        });
      }
    }

    // --- Medication ---------------------------------------------------------------------------------
    for (const actor of [OFFICER, CONTRACTOR]) {
      write(`medication/animals.${actor.role}.json`, {
        endpoint: 'GET /medication/animals?date={YYYY-MM-DD}',
        description: 'Medication tab: animals with medication today, those needing a dose first.',
        role: actor.role,
        request: { date: '2026-10-26' },
        response: await medication.listMedicationAnimals(actor, EXPORT_NOW),
      });
    }
    const medAnimal = (await medication.listMedicationAnimals(OFFICER, EXPORT_NOW))[0]?.animal;
    if (!medAnimal) throw new Error('The seed data needs an animal with medication today');
    const medDay = await medication.getMedicationDay(OFFICER, medAnimal.id, EXPORT_NOW);
    write('medication/day.json', {
      endpoint: 'GET /animals/{animalId}/medication?date={YYYY-MM-DD}',
      description: 'Medication for one animal: today\'s dose slots with status (upcoming / due / overdue / administered).',
      role: 'officer',
      request: { animalId: medAnimal.id, date: '2026-10-26' },
      response: medDay,
    });

    // --- Cases --------------------------------------------------------------------------------------
    for (const actor of [OFFICER, CONTRACTOR]) {
      write(`cases/list.${actor.role}.json`, {
        endpoint: 'GET /cases',
        description: 'Cases tab: every case in scope, open work first then most recently updated. Filters (open / review / last 7 days / mine) and search run on the device.',
        role: actor.role,
        response: await cases.listCases(actor, EXPORT_NOW),
      });
    }
    const caseList = await cases.listCases(OFFICER, EXPORT_NOW);
    for (const status of ['open', 'review', 'closed'] as const) {
      const item = caseList.find((c) => c.healthCase.status === status);
      if (!item) continue;
      write(`cases/detail.${status}.json`, {
        endpoint: 'GET /cases/{caseId}',
        description: `Case detail for a case in "${status}" status, with the AI case summary.`,
        role: 'officer',
        request: { caseId: item.healthCase.id },
        response: await cases.getCase(OFFICER, item.healthCase.id, EXPORT_NOW),
      });
    }

    // --- Observations and review queue --------------------------------------------------------------
    write('observations/review-queue.json', {
      endpoint: 'GET /observations/review-queue',
      description: 'Review queue (officers only): unmatched, low-confidence and AI-unavailable observations.',
      role: 'officer',
      response: await observations.listReviewQueue(),
    });
    for (const status of ['awaiting-confirmation', 'review', 'routed'] as const) {
      const observation = db.mockDb.observations.find((o) => o.status === status);
      if (!observation) continue;
      write(`observations/detail.${status}.json`, {
        endpoint: 'GET /observations/{observationId}',
        description: `Confirm AI result screen for an observation in "${status}" status.`,
        request: { observationId: observation.id },
        response: await observations.getObservation(observation.id),
      });
    }

    // --- Sync and notifications ---------------------------------------------------------------------
    write('sync/state.json', { endpoint: '(device only)', description: 'Pending sync screen. This is the device outbox, not a backend endpoint; included so the shape is documented.', response: await sync.getSyncState() });
    write('notifications/push.json', {
      endpoint: 'PUSH payload',
      description: 'Push notification payload. Must never carry sensitive health data beyond what is shown.',
      response: await notifications.getDemoPush(EXPORT_NOW),
    });

    // --- Mutations (each on a fresh copy of the seed data) --------------------------------------------
    const officerAnimal = list.find((item) => !item.sessionDone && !item.unwell) ?? unwell;
    const healthy: InspectionInput = inspections.createDefaultInspection();
    const abnormal: InspectionInput = { ...healthy, systems: { ...healthy.systems, skin: 'abnormal' }, otherFindings: 'Red patch on left flank, scratching.' };

    db.resetMockDb();
    write('inspections/submit.normal.json', {
      endpoint: 'POST /inspections',
      description: 'Record an AM/PM inspection. Time and user come from the server/session. One AM and one PM per animal per day.',
      role: 'officer',
      request: { animalId: officerAnimal.animal.id, session: 'AM', input: healthy },
      response: await inspections.submitInspection({ animalId: officerAnimal.animal.id, session: 'AM', input: healthy, actor: OFFICER, now: EXPORT_NOW }),
    });
    write('inspections/submit.error-already-recorded.json', {
      endpoint: 'POST /inspections',
      description: 'Second inspection for the same animal, day and session. Suggested status: 409.',
      role: 'officer',
      request: { animalId: officerAnimal.animal.id, session: 'AM', input: healthy },
      response: await errorOf(() => inspections.submitInspection({ animalId: officerAnimal.animal.id, session: 'AM', input: healthy, actor: OFFICER, now: EXPORT_NOW })),
    });
    db.resetMockDb();
    write('inspections/submit.abnormal.json', {
      endpoint: 'POST /inspections',
      description: 'Inspection with abnormal items: linked to a matching open case, or sent to the review queue for AI routing.',
      role: 'officer',
      request: { animalId: officerAnimal.animal.id, session: 'AM', input: abnormal },
      response: await inspections.submitInspection({ animalId: officerAnimal.animal.id, session: 'AM', input: abnormal, actor: OFFICER, now: EXPORT_NOW }),
    });

    db.resetMockDb();
    const dueSlot = (await medication.getMedicationDay(OFFICER, medAnimal.id, EXPORT_NOW))?.slots.find((s) => s.status === 'due' || s.status === 'overdue');
    if (dueSlot) {
      const request = { scheduleId: dueSlot.scheduleId, slot: dueSlot.slot, remarks: 'Took it with food.' };
      write('medication/record.json', {
        endpoint: 'POST /medication/administrations',
        description: 'Record a dose. Time and user are captured by the server. Only one record per dose slot.',
        role: 'officer',
        request,
        response: await medication.recordAdministration({ ...request, actor: OFFICER, now: EXPORT_NOW }),
      });
      write('medication/record.error-already-recorded.json', {
        endpoint: 'POST /medication/administrations',
        description: 'Second record for the same dose slot. Suggested status: 409.',
        role: 'officer',
        request,
        response: await errorOf(() => medication.recordAdministration({ ...request, actor: OFFICER, now: EXPORT_NOW })),
      });
    }

    db.resetMockDb();
    const obsRequest = { animalId: unwell.animal.id, text: `${unwell.animal.name} vomited twice this morning and left half the food.`, media: [{ id: 'media-1', kind: 'photo' as const }] };
    const created = await observations.submitObservation({ ...obsRequest, actor: OFFICER, now: EXPORT_NOW });
    write('observations/submit.json', {
      endpoint: 'POST /observations',
      description: 'New Health Observation. Saved immediately with status "processing"; the AI result follows (poll GET /observations/{id}).',
      role: 'officer',
      request: obsRequest,
      response: created,
    });
    const analysed = await observations.getObservation(created.id);
    write('observations/detail.after-ai.json', {
      endpoint: 'GET /observations/{observationId}',
      description: 'The same observation once the AI result is ready.',
      request: { observationId: created.id },
      response: analysed,
    });
    const suggestion = analysed?.observation.ai?.suggestion;
    if (analysed?.observation.ai && suggestion) {
      const request = {
        animalId: analysed.observation.ai.match?.animalId ?? unwell.animal.id,
        signs: analysed.observation.ai.extraction.signs,
        action: suggestion.action,
        caseId: suggestion.caseId,
      };
      write('observations/confirm-routing.json', {
        endpoint: 'POST /observations/{observationId}/routing',
        description: 'Confirm & Route (and review-queue triage). Records the officer\'s decision and creates, updates or reopens a case.',
        role: 'officer',
        request: { observationId: created.id, ...request },
        response: await observations.confirmRouting({ observationId: created.id, ...request, actor: OFFICER, now: EXPORT_NOW }),
      });
    }

    db.resetMockDb();
    const openCase = (await cases.listCases(OFFICER, EXPORT_NOW)).find((c) => c.healthCase.status !== 'closed');
    if (openCase) {
      write('cases/close.error-reason-required.json', {
        endpoint: 'POST /cases/{caseId}/close',
        description: 'Closing a case needs a reason. Suggested status: 400.',
        role: 'officer',
        request: { caseId: openCase.healthCase.id, reason: '', note: '' },
        response: await errorOf(() => cases.closeCase({ caseId: openCase.healthCase.id, reason: '', note: '', actor: OFFICER, now: EXPORT_NOW })),
      });
      write('cases/close.error-forbidden.json', {
        endpoint: 'POST /cases/{caseId}/close',
        description: 'Only officers may close a case. Suggested status: 403.',
        role: 'contractor',
        request: { caseId: openCase.healthCase.id, reason: 'Resolved', note: '' },
        response: await errorOf(() => cases.closeCase({ caseId: openCase.healthCase.id, reason: 'Resolved', note: '', actor: CONTRACTOR, now: EXPORT_NOW })),
      });
      await cases.closeCase({ caseId: openCase.healthCase.id, reason: 'Resolved', note: 'Eating normally again.', actor: OFFICER, now: EXPORT_NOW });
      write('cases/close.json', {
        endpoint: 'POST /cases/{caseId}/close',
        description: 'Close a case with a reason (officers only). The app re-reads the case afterwards; the response is the updated case detail.',
        role: 'officer',
        request: { caseId: openCase.healthCase.id, reason: 'Resolved', note: 'Eating normally again.' },
        response: await cases.getCase(OFFICER, openCase.healthCase.id, EXPORT_NOW),
      });
    }

    db.resetMockDb();
    const draftDetails = {
      name: 'Bao', kennel: 'KC2-7', species: 'Cat' as const, countryCode: 'JP', microchip: '392140000123456', sex: 'Female' as const, dateOfBirth: '12/03/2023', releaseDate: '25/11/2026',
    };
    write('arrivals/draft.json', {
      endpoint: 'PUT /arrivals/draft',
      description: 'Autosaved New Arrival draft (one per user). GET /arrivals/draft returns the same shape or null.',
      role: 'officer',
      request: { details: draftDetails },
      response: await arrivals.saveArrivalDraft({ details: draftDetails }),
    });
    write('arrivals/microchip-check.json', {
      endpoint: 'GET /animals/microchip/{microchip}/taken',
      description: 'Microchip uniqueness across active stays.',
      request: { microchip: unwell.animal.microchip },
      response: { taken: await arrivals.isMicrochipTaken(unwell.animal.microchip) },
    });
    const exam = {
      vetId: 'vet-1',
      weightKg: '4.2',
      mentation: 'Alert' as const,
      findings: Object.fromEntries(['skin', 'eyes', 'nose', 'ears', 'mouth', 'hydration', 'respiratory'].map((s) => [s, { abnormal: s === 'ears', note: s === 'ears' ? 'Mild wax build-up, left ear.' : '', photos: s === 'ears' ? [{ id: 'photo-1' }] : [] }])),
    } as import('@/domain/types').ArrivalExamInput;
    write('arrivals/complete.json', {
      endpoint: 'POST /arrivals',
      description: 'Complete Arrival Exam: creates the animal stay (Active monitoring) and its baseline exam in one call, then discards the draft. Officers only.',
      role: 'officer',
      request: { details: draftDetails, exam },
      response: await arrivals.completeArrival({ details: draftDetails, exam }),
    });
    write('arrivals/complete.error-microchip-taken.json', {
      endpoint: 'POST /arrivals',
      description: 'Microchip already registered to an active stay. Suggested status: 409.',
      role: 'officer',
      request: { details: draftDetails, exam },
      response: await errorOf(() => arrivals.completeArrival({ details: draftDetails, exam })),
    });

    db.resetMockDb();
    fs.copyFileSync(path.join(__dirname, '..', 'src', 'domain', 'types.ts'), path.join(OUT_DIR, 'types.ts'));
    written.push('types.ts');
    fs.writeFileSync(path.join(OUT_DIR, 'index.json'), `${JSON.stringify({ generatedAt: new Date(EXPORT_NOW).toISOString(), timezone: 'Asia/Singapore', files: written.sort() }, null, 2)}\n`);
    expect(written.length).toBeGreaterThan(20);
  });
});

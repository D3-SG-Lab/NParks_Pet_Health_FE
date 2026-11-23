/**
 * Ad-hoc observations, AI confirmation and the review queue.
 *
 * With EXPO_PUBLIC_API_URL set (observationBackend.ts): an observation that is unlinked or about a backend
 * animal is saved with POST /observations; one opened by id is loaded with GET /observations/{id} and its
 * AI result with GET /observations/{id}/ai-result; Confirm & Route sends POST /observations/{id}/route;
 * AI triage merges GET /observations/review-queue. Observations about demo animals stay on the in-memory
 * store. Until the server has an AI result, the rule-based mock AI (src/mock/ai.ts) runs on the device.
 * Still MOCK: "Correct" (send to AI triage) has no endpoint, so it only changes the device's copy.
 * Media upload (POST /media/presign) needs a real camera/picker, which the app does not have yet.
 */
import { ApiError, isApiEnabled } from '@/api';
import type {
  Actor,
  Animal,
  ClinicalSign,
  HealthCase,
  MediaItem,
  Observation,
  RoutingAction,
} from '@/domain/types';
import { ensureAnimal, syncAnimals } from '@/features/animals/animalSource';
import { syncCases } from '@/features/cases/casesApi';
import { AI_PROCESSING_MS } from '@/mock/ai';
import { applyRouting } from '@/mock/caseRules';
import { mockDb, mockSigns, newMockId } from '@/mock/db';
import { overTheWire, simulateLatency } from '@/mock/latency';
import { resolvePendingAnalyses } from '@/mock/processing';
import { isOnline, queueIfOffline } from '@/mock/sync';
import { isBackendId } from '@/mock/scope';
import { formatTime } from '@/utils/dates';

import * as backend from './observationBackend';

/** Review threshold and confidence wording. Later these come with the AI result from the backend. */
export { CONFIDENCE_THRESHOLD, confidenceLabel, needsReview } from '@/mock/ai';

export class ObservationError extends Error {
  readonly kind: 'empty' | 'not_found' | 'no_animal' | 'already_routed' | 'invalid_case' | 'rejected' | 'offline';
  constructor(kind: ObservationError['kind'], message: string) {
    super(message);
    this.name = 'ObservationError';
    this.kind = kind;
  }
}

export async function listSigns(): Promise<ClinicalSign[]> {
  await simulateLatency(0);
  return [...mockSigns];
}

export interface SubmitObservationInput {
  animalId: string | null;
  text: string;
  media: MediaItem[];
  actor: Actor;
  now?: number;
}

/**
 * Saves the observation straight away (so it is never lost if AI is unavailable) and returns; the AI
 * result follows (status "processing" until ready). Offline, it is kept on the device and only goes
 * to the AI once it has synced. Confident matches then wait for confirmation; unmatched or
 * low-confidence ones go to the review queue.
 */
export async function submitObservation({ animalId, text, media, actor, now = Date.now() }: SubmitObservationInput): Promise<Observation> {
  await simulateLatency();
  // The AI matches the text against the current animals.
  await syncAnimals();
  const trimmed = text.trim();
  if (!trimmed && media.length === 0) throw new ObservationError('empty', 'Describe what you saw.');
  // Unlinked text, or a backend animal: the backend stores it. Demo animals and "Work offline (demo)" stay local.
  if (isApiEnabled() && isOnline() && (animalId === null || isBackendId(animalId))) {
    const saved = await backend.submitObservation(animalId, trimmed, actor);
    // Photos and videos are placeholders until the media upload is real; keep them on the device copy.
    const observation: Observation = { ...saved, media, readyAt: saved.aiUnavailable ? null : now + AI_PROCESSING_MS };
    mockDb.observations.push(observation);
    resolvePendingAnalyses(now);
    return observation;
  }
  const observation: Observation = {
    id: newMockId('obs'),
    animalId,
    text: trimmed,
    media,
    submittedAt: now,
    submittedBy: actor.name,
    submittedByRole: actor.role,
    source: 'observation',
    ai: null,
    status: 'processing',
    routing: null,
    readyAt: now + AI_PROCESSING_MS,
    aiUnavailable: false,
  };
  mockDb.observations.push(observation);
  const animal = mockDb.animals.find((a) => a.id === animalId);
  const photos = media.filter((m) => m.kind === 'photo').length;
  const videos = media.length - photos;
  const queued = queueIfOffline({
    kind: 'observation',
    recordId: observation.id,
    title: `Observation${animal ? ` · ${animal.kennel} ${animal.name}` : ''}`,
    detail: `${[photos ? `${photos} photo${photos > 1 ? 's' : ''}` : null, videos ? `${videos} video${videos > 1 ? 's' : ''}` : null].filter(Boolean).join(', ') || 'Text only'} · saved ${formatTime(now)}`,
    savedAt: now,
    // Demo: the first upload of an observation with media fails once, to show Retry.
    failOnce: media.length > 0,
  });
  if (queued) observation.readyAt = null;
  resolvePendingAnalyses(now);
  return observation;
}

/** True when the record was kept on the device (offline) instead of being sent. */
export function isWorkingOffline(): boolean {
  return !isOnline();
}

export interface ObservationDetail {
  observation: Observation;
  /** Animals the AI or user matched, plus every animal referenced by the routing options. */
  animal: Animal | null;
  cases: HealthCase[];
}

/** Backend calls only run online; offline (demo) screens read the device's copy. */
function backendOnline(): boolean {
  return isApiEnabled() && isOnline();
}

/** Server data that only adds detail (cases for routing choices, the triage queue): failures are logged, not shown. */
async function optional(load: Promise<unknown>, what: string): Promise<void> {
  try {
    await load;
  } catch (error) {
    if (__DEV__) console.warn(`Observations: couldn't load ${what}.`, error);
  }
}

export async function getObservation(id: string): Promise<ObservationDetail | null> {
  await simulateLatency();
  if (backendOnline() && isBackendId(id)) {
    await backend.getObservation(id);
    // The routing choices list the animal's cases.
    await optional(syncCases(), 'the cases');
  }
  resolvePendingAnalyses();
  const observation = mockDb.observations.find((o) => o.id === id);
  if (!observation) return null;
  const animalId = observation.routing?.animalId ?? observation.ai?.match?.animalId ?? observation.animalId;
  return overTheWire({
    observation,
    animal: mockDb.animals.find((a) => a.id === animalId) ?? null,
    cases: mockDb.cases.filter((c) => c.animalId === animalId),
  });
}

/** Cases an observation could be routed to for a given animal (used when the user changes the animal). */
export async function listCasesForAnimal(animalId: string): Promise<HealthCase[]> {
  await simulateLatency(0);
  if (backendOnline() && isBackendId(animalId)) await optional(syncCases(), 'the cases');
  return overTheWire(mockDb.cases.filter((c) => c.animalId === animalId));
}

export interface ConfirmRoutingInput {
  observationId: string;
  animalId: string | null;
  signs: ClinicalSign[];
  action: RoutingAction;
  caseId: string | null;
  actor: Actor;
  now?: number;
}

export interface ConfirmRoutingResult {
  caseId: string | null;
  animalId: string;
}

/** The server's rejection as an ObservationError with its message; anything else is rethrown. */
function routingErrorFrom(error: unknown): never {
  if (error instanceof ApiError && error.rejected) {
    const kind = error.status === 404 ? 'not_found' : error.status === 409 ? 'already_routed' : 'rejected';
    throw new ObservationError(kind, error.message);
  }
  throw error;
}

/** POST /observations/{id}/route for a backend observation; the server applies the case rule. */
async function confirmOnBackend(observation: Observation, input: ConfirmRoutingInput & { animalId: string }, now: number): Promise<ConfirmRoutingResult> {
  if (!isOnline()) throw new ObservationError('offline', 'Routing needs a connection. Turn off "Work offline" and try again.');
  if (!isBackendId(input.animalId)) throw new ObservationError('no_animal', 'Pick an animal registered on the server.');
  let caseId: string | null;
  try {
    caseId = await backend.routeObservation(observation.id, { action: input.action, animalId: input.animalId, caseId: input.caseId, signs: input.signs });
  } catch (error) {
    return routingErrorFrom(error);
  }
  if (observation.ai) observation.ai.extraction.signs = [...input.signs];
  observation.animalId = input.animalId;
  observation.status = 'routed';
  observation.routing = { action: input.action, animalId: input.animalId, caseId, confirmedBy: input.actor.name, confirmedAt: now };
  // The case was created or changed on the server.
  await optional(syncCases(), 'the cases');
  return { caseId, animalId: input.animalId };
}

/** Confirm & Route (FE-012) and review-queue triage (FE-017). The officer's decision is recorded. */
export async function confirmRouting(input: ConfirmRoutingInput): Promise<ConfirmRoutingResult> {
  await simulateLatency();
  const now = input.now ?? Date.now();
  const observation = mockDb.observations.find((o) => o.id === input.observationId);
  if (!observation) throw new ObservationError('not_found', 'This observation no longer exists.');
  if (observation.status === 'routed') throw new ObservationError('already_routed', 'This observation was already routed.');
  if (!input.animalId) throw new ObservationError('no_animal', 'Pick the animal first.');
  if ((input.action === 'update-case' || input.action === 'reopen-case') && !input.caseId) {
    throw new ObservationError('invalid_case', 'Choose the case to update.');
  }
  if (isApiEnabled() && isBackendId(observation.id)) return confirmOnBackend(observation, { ...input, animalId: input.animalId }, now);

  const healthCase = applyRouting({
    action: input.action,
    animalId: input.animalId,
    caseId: input.caseId,
    signs: input.signs,
    detail: observation.text,
    media: observation.media,
    observationId: observation.id,
    actor: input.actor,
    now,
  });
  if (observation.ai) observation.ai.extraction.signs = [...input.signs];
  observation.status = 'routed';
  observation.routing = {
    action: input.action,
    animalId: input.animalId,
    caseId: healthCase?.id ?? null,
    confirmedBy: input.actor.name,
    confirmedAt: now,
  };
  // A case flagged for review is back to Open once nothing for it awaits confirmation.
  const stillPending = mockDb.observations.some(
    (o) => o.status === 'awaiting-confirmation' && o.ai?.suggestion.caseId === healthCase?.id,
  );
  if (healthCase?.status === 'review' && !stillPending) healthCase.status = 'open';
  return { caseId: healthCase?.id ?? null, animalId: input.animalId };
}

/** "Correct": the AI result is wrong, so leave it for manual triage. */
export async function sendToReviewQueue(observationId: string): Promise<void> {
  await simulateLatency(150);
  const observation = mockDb.observations.find((o) => o.id === observationId);
  if (!observation) throw new ObservationError('not_found', 'This observation no longer exists.');
  if (observation.status !== 'routed') observation.status = 'review';
}

export type ReviewReason = 'no-match' | 'low-confidence' | 'ai-unavailable';

export interface ReviewQueueItem {
  observation: Observation;
  reason: ReviewReason;
  guess: Animal | null;
  guessCase: HealthCase | null;
  /** Other possible animals with their scores ("AI candidates: KC2-4 Coco (48%)"). */
  candidates: { animal: Animal; confidence: number }[];
}

function reviewReason(observation: Observation): ReviewReason {
  if (observation.aiUnavailable || !observation.ai) return 'ai-unavailable';
  return observation.ai.match ? 'low-confidence' : 'no-match';
}

const REASON_ORDER: Record<ReviewReason, number> = { 'no-match': 0, 'low-confidence': 1, 'ai-unavailable': 2 };

/**
 * Merges the server's review queue (GET /observations/review-queue) into the store, with the animals it
 * mentions. Used by AI triage and the Operations review count. Does nothing without the API or offline.
 */
export async function syncReviewQueue(): Promise<void> {
  if (!backendOnline()) return;
  const { stayIds } = await backend.loadReviewQueue();
  await Promise.all(stayIds.map((id) => optional(ensureAnimal(id), `animal ${id}`)));
}

/**
 * Observations the AI could not match, scored below the threshold, or could not process (BE-019).
 * Unmatched first (they need the most work), then low confidence, then AI unavailable; newest first.
 * With the API, the server's queue is merged in; ones it holds that await confirmation are opened from
 * Operations and the case instead.
 */
export async function listReviewQueue(): Promise<ReviewQueueItem[]> {
  await simulateLatency();
  await syncAnimals();
  await Promise.all([syncReviewQueue(), optional(syncCases(), 'the cases')]);
  resolvePendingAnalyses();
  const animals = new Map(mockDb.animals.map((a) => [a.id, a]));
  return overTheWire(mockDb.observations
    .filter((o) => o.status === 'review')
    .map((observation) => ({
      observation,
      reason: reviewReason(observation),
      guess: animals.get(observation.ai?.match?.animalId ?? '') ?? null,
      guessCase: mockDb.cases.find((c) => c.id === observation.ai?.suggestion.caseId) ?? null,
      candidates: (observation.ai?.candidates ?? []).flatMap((c) => {
        const animal = animals.get(c.animalId);
        return animal ? [{ animal, confidence: c.confidence }] : [];
      }),
    }))
    .sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason] || b.observation.submittedAt - a.observation.submittedAt));
}
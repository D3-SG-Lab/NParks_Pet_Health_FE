/**
 * Observation endpoints on the real backend (Postman "Observation (AQC)"). Used by observationApi.ts and
 * the animal profile when EXPO_PUBLIC_API_URL is set.
 *
 * - POST /api/v1/observations                   submit (stayId optional: the AI matches unlinked text)
 * - GET  /api/v1/observations/{id}              one observation (record detail sheet)
 * - GET  /api/v1/animals/{stayId}/observations  a stay's observations, newest first (animal timeline)
 * - GET  /api/v1/observations/{id}/ai-result    the AI analysis (404 until it is ready)
 * - POST /api/v1/observations/{id}/route        confirm the routing decision (officers and supervisors)
 * - GET  /api/v1/observations/review-queue      observations awaiting human triage (AI triage)
 *
 * The server's AI result is used when it has one. Until then (the server's AI worker may not be running),
 * the app runs the mock AI (src/mock/ai.ts) on the device after AI_PROCESSING_MS, so "Confirm AI result"
 * still works; the routing decision is sent to the server either way. Media: the screens have no real
 * camera or upload yet, so `media` is sent empty.
 */
import { ApiError, unwrap } from '@/api';
import {
  getApiV1AnimalsByStayIdObservations,
  getApiV1ObservationsById,
  getApiV1ObservationsByIdAiResult,
  getApiV1ObservationsReviewQueue,
  postApiV1Observations,
  postApiV1ObservationsByIdRoute,
} from '@/api/generated';
import type { ConfirmRoutingRequest, ObservationAiResultResponse, ObservationResponse, ReviewQueueItemResponse } from '@/api/generated';
import {
  FOOD_LEVELS,
  STOOL_TYPES,
  type Actor,
  type AiResult,
  type ClinicalSign,
  type MediaItem,
  type Observation,
  type RoutingAction,
  type Severity,
} from '@/domain/types';
import { AI_PROCESSING_MS, needsReview } from '@/mock/ai';
import { mockDb, mockSigns } from '@/mock/db';
import { isoDateOf } from '@/utils/dates';

const ROUTING_ACTIONS: readonly RoutingAction[] = ['timeline-only', 'update-case', 'new-case', 'reopen-case'];
const SEVERITIES: readonly Severity[] = ['mild', 'moderate', 'severe'];

function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : null;
  return values.find((v) => v.toLowerCase() === lower) ?? null;
}

function toMedia(dto: ObservationResponse): MediaItem[] {
  return [...dto.media]
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((m) => ({
      id: String(m.id),
      kind: m.mediaKind === 'video' ? 'video' : 'photo',
      ...(m.durationSec === null ? {} : { durationSec: Number(m.durationSec) }),
    }));
}

/**
 * The app's Observation for one the backend returned. `submittedBy` is a user id; the name and role are
 * only known for the signed-in user's own submissions (`author`). The mock AI analyses it when read.
 */
export function toObservation(dto: ObservationResponse, author?: Pick<Actor, 'name' | 'role'>): Observation {
  const submittedAt = Date.parse(dto.submittedAt) || Date.now();
  if (dto.status === 'routed' || dto.status === 'review') {
    // Routed on the server (the case it went to is linked from the case's events), or waiting in triage.
    return {
      ...toObservation({ ...dto, status: 'processing' }, author),
      status: dto.status,
      readyAt: null,
      routing: dto.status === 'routed' && dto.stayId !== null ? serverRouting(String(dto.id), String(dto.stayId), submittedAt) : null,
    };
  }
  return {
    id: String(dto.id),
    animalId: dto.stayId === null ? null : String(dto.stayId),
    text: dto.text,
    media: toMedia(dto),
    submittedAt,
    submittedBy: author?.name ?? `Staff #${dto.submittedBy}`,
    submittedByRole: author?.role ?? 'officer',
    source: dto.source === 'inspection' ? 'inspection' : 'observation',
    ai: null,
    // AI unavailable: straight to triage. Otherwise the mock AI result is ready AI_PROCESSING_MS after submit.
    status: dto.aiUnavailable ? 'review' : 'processing',
    routing: null,
    readyAt: dto.aiUnavailable ? null : submittedAt + AI_PROCESSING_MS,
    aiUnavailable: dto.aiUnavailable,
  };
}

export async function submitObservation(stayId: string | null, text: string, author: Pick<Actor, 'name' | 'role'>): Promise<Observation> {
  const dto = await unwrap(postApiV1Observations({ body: { stayId: stayId === null ? null : Number(stayId), text, media: [] } }));
  return toObservation(dto, author);
}

/** Routing for an observation the server reports as routed; the case comes from the cases' events. */
function serverRouting(observationId: string, animalId: string, at: number): Observation['routing'] {
  const healthCase = mockDb.cases.find((c) => c.events.some((e) => e.observationId === observationId));
  return { action: healthCase ? 'update-case' : 'timeline-only', animalId, caseId: healthCase?.id ?? null, confirmedBy: '', confirmedAt: at };
}

/**
 * Adds a stay's observations from the server to the store. Ones already there keep their device state
 * (the mock AI result), unless the server has since routed them.
 */
export async function loadObservations(animalId: string): Promise<void> {
  const list = await unwrap(getApiV1AnimalsByStayIdObservations({ path: { stayId: Number(animalId) } }));
  for (const dto of list) mergeObservation(dto);
}

/** Adds the server's copy to the store, or updates the stored one when the server has routed it. */
function mergeObservation(dto: ObservationResponse, author?: Pick<Actor, 'name' | 'role'>): Observation {
  const fromServer = toObservation(dto, author);
  const local = mockDb.observations.find((o) => o.id === fromServer.id);
  if (!local) {
    mockDb.observations.push(fromServer);
    return fromServer;
  }
  if (fromServer.status === 'routed' && local.status !== 'routed') {
    local.status = 'routed';
    local.routing = fromServer.routing;
  }
  return local;
}

/**
 * One observation from the server (merged into the store), with the server's AI result once it has one,
 * or null when the server has none with that id. Without a server result the device's mock AI result is
 * kept (resolvePendingAnalyses).
 */
export async function getObservation(id: string): Promise<Observation | null> {
  let observation: Observation;
  try {
    observation = mergeObservation(await unwrap(getApiV1ObservationsById({ path: { id: Number(id) } })));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return mockDb.observations.find((o) => o.id === id) ?? null;
    throw error;
  }
  if (observation.status !== 'routed') {
    const ai = await getAiResult(observation);
    if (ai) applyAiResult(observation, ai, null);
  }
  return observation;
}

// --- AI result ----------------------------------------------------------------------------------

function toSign(code: string): ClinicalSign {
  const known = mockSigns.find((sign) => sign.code === code || sign.label.toLowerCase() === code.toLowerCase());
  if (known) return known;
  const words = code.replace(/[-_]+/g, ' ').trim();
  return { code, label: words.charAt(0).toUpperCase() + words.slice(1), system: 'General' };
}

/** 0..1; the server may send a percentage. */
function toConfidence(value: number | string | null): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1 ? Math.min(1, n / 100) : n;
}

export function toAiResult(dto: ObservationAiResultResponse, observation: Pick<Observation, 'animalId' | 'submittedAt' | 'readyAt'>): AiResult {
  const matched = dto.matchedStayId === null ? null : String(dto.matchedStayId);
  const suggestedCase = dto.suggestedCaseId === null ? null : String(dto.suggestedCaseId);
  const ready = observation.readyAt ?? Date.now();
  return {
    match: matched ? { animalId: matched, confidence: toConfidence(dto.matchConfidence), selectedByUser: observation.animalId === matched } : null,
    candidates: [],
    extraction: {
      signs: dto.signs.map((sign) => toSign(sign.code)),
      food: oneOf(FOOD_LEVELS, dto.foodExtracted),
      stool: oneOf(STOOL_TYPES, dto.stoolExtracted),
      onsetDate: dto.onsetDate ?? isoDateOf(observation.submittedAt),
      severity: oneOf(SEVERITIES, dto.severity) ?? 'mild',
    },
    // Cases are keyed by case number; a numeric id is matched by casesApi when the case list is loaded.
    suggestion: { action: oneOf(ROUTING_ACTIONS, dto.suggestedAction) ?? 'timeline-only', caseId: suggestedCase, rationale: dto.rationale ?? '' },
    processedAt: ready,
    durationSec: Math.max(1, Math.round((ready - observation.submittedAt) / 1000)),
  };
}

/** GET /observations/{id}/ai-result, or null while the server has none (404). */
async function getAiResult(observation: Observation): Promise<AiResult | null> {
  try {
    return toAiResult(await unwrap(getApiV1ObservationsByIdAiResult({ path: { id: Number(observation.id) } })), observation);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Puts the server's AI result on the stored observation. `serverStatus` is the queue's status, if known. */
function applyAiResult(observation: Observation, ai: AiResult, serverStatus: string | null): void {
  observation.ai = ai;
  observation.readyAt = null;
  observation.status = serverStatus === 'review' || needsReview(ai) ? 'review' : 'awaiting-confirmation';
}

// --- Routing ------------------------------------------------------------------------------------

export interface RouteInput {
  action: RoutingAction;
  animalId: string;
  /** Case number, for update-case and reopen-case. */
  caseId: string | null;
  signs: readonly ClinicalSign[];
}

/** "GI upset — vomiting, reduced appetite", as the mock case rules word a new case. */
export function findingFor(signs: readonly ClinicalSign[]): string {
  const main = signs[0];
  if (!main) return 'Health concern';
  return `${main.system === 'General' ? 'Unwell' : `${main.system} upset`} — ${signs.map((s) => s.label.toLowerCase()).join(', ')}`;
}

/**
 * POST /observations/{id}/route. Returns the case number the observation went to (null for timeline
 * only). Throws ApiError: 400 invalid input, 403 not an officer or supervisor, 409 already routed.
 */
export async function routeObservation(observationId: string, input: RouteInput): Promise<string | null> {
  const body: ConfirmRoutingRequest = {
    action: input.action,
    stayId: Number(input.animalId),
    caseId: input.action === 'update-case' || input.action === 'reopen-case' ? input.caseId : null,
    finding: input.action === 'new-case' ? findingFor(input.signs) : null,
    clinicalSystem: input.action === 'new-case' ? (input.signs[0]?.system ?? 'General') : null,
    confirmedSigns: input.signs.map((sign) => sign.code),
  };
  const result = await unwrap(postApiV1ObservationsByIdRoute({ path: { id: Number(observationId) }, body }));
  mergeObservation(result.observation);
  return result.caseNumber ?? (result.caseId === null ? null : String(result.caseId));
}

// --- Review queue -------------------------------------------------------------------------------

function fromQueueItem(dto: ReviewQueueItemResponse): Observation {
  return toObservation({
    id: dto.id,
    stayId: dto.animal?.stayId ?? null,
    text: dto.text,
    submittedBy: dto.submittedBy.id,
    submittedAt: dto.submittedAt,
    source: 'observation',
    status: 'processing',
    aiUnavailable: dto.aiUnavailable,
    readyAt: null,
    media: [],
  }, { name: dto.submittedBy.name, role: 'officer' });
}

/** The queue's AI suggestion, when the full AI result can't be loaded. */
function suggestionResult(dto: ReviewQueueItemResponse, observation: Observation): AiResult | null {
  if (!dto.aiSuggestion) return null;
  return toAiResult(
    {
      observationId: dto.id,
      matchedStayId: dto.animal?.stayId ?? null,
      matchConfidence: null,
      foodExtracted: null,
      stoolExtracted: null,
      onsetDate: null,
      severity: dto.aiSuggestion.severity,
      suggestedAction: dto.aiSuggestion.suggestedAction,
      suggestedCaseId: null,
      rationale: null,
      signs: dto.aiSuggestion.signs.map((code) => ({ code })),
    },
    observation,
  );
}

/**
 * GET /observations/review-queue. Merges the queued observations into the store with the server's AI
 * result, and returns their ids (the queue also holds ones awaiting confirmation). The stays they
 * mention are returned too, so the caller can make sure they are loaded.
 */
export async function loadReviewQueue(): Promise<{ ids: string[]; stayIds: string[] }> {
  const queue = await unwrap(getApiV1ObservationsReviewQueue());
  await Promise.all(
    queue.map(async (dto) => {
      const id = String(dto.id);
      let observation = mockDb.observations.find((o) => o.id === id);
      if (!observation) {
        observation = fromQueueItem(dto);
        mockDb.observations.push(observation);
      }
      if (observation.status === 'routed') return;
      if (dto.aiUnavailable) {
        Object.assign(observation, { ai: null, aiUnavailable: true, status: 'review', readyAt: null });
        return;
      }
      const ai = (await getAiResult(observation).catch(() => null)) ?? suggestionResult(dto, observation);
      if (ai) applyAiResult(observation, ai, dto.status);
      else Object.assign(observation, { status: 'review', readyAt: null });
    }),
  );
  return {
    ids: queue.map((dto) => String(dto.id)),
    stayIds: queue.flatMap((dto) => (dto.animal ? [String(dto.animal.stayId)] : [])),
  };
}

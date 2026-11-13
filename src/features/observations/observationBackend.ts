/**
 * Observation endpoints on the real backend (Postman "Observation (AQC)"). Used by observationApi.ts and
 * the animal profile when EXPO_PUBLIC_API_URL is set.
 *
 * - POST /api/v1/observations                   submit (stayId optional: the AI matches unlinked text)
 * - GET  /api/v1/observations/{id}              one observation (record detail sheet)
 * - GET  /api/v1/animals/{stayId}/observations  a stay's observations, newest first (animal timeline)
 *
 * The responses carry no AI result or routing (status is only "processing" / "ready"), and there are no
 * endpoints to confirm routing or work the review queue yet. So the app keeps running the mock AI
 * (src/mock/ai.ts) on these observations to drive "Confirm AI result" and AI triage; that state lives
 * only on this device. Media: the screens have no real camera or upload yet, so `media` is sent empty.
 */
import { ApiError, unwrap } from '@/api';
import { getApiV1AnimalsByStayIdObservations, getApiV1ObservationsById, postApiV1Observations } from '@/api/generated';
import type { ObservationResponse } from '@/api/generated';
import type { Actor, MediaItem, Observation } from '@/domain/types';
import { AI_PROCESSING_MS } from '@/mock/ai';
import { mockDb } from '@/mock/db';

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

/**
 * Adds a stay's observations from the server to the store. Ones already there keep their local state
 * (AI result, routing), since the server does not hold it.
 */
export async function loadObservations(animalId: string): Promise<void> {
  const list = await unwrap(getApiV1AnimalsByStayIdObservations({ path: { stayId: Number(animalId) } }));
  const known = new Set(mockDb.observations.map((o) => o.id));
  mockDb.observations.push(...list.filter((dto) => !known.has(String(dto.id))).map((dto) => toObservation(dto)));
}

/** One observation (kept locally if already known), or null when the server has none with that id. */
export async function getObservation(id: string): Promise<Observation | null> {
  const local = mockDb.observations.find((o) => o.id === id);
  if (local) return local;
  try {
    const observation = toObservation(await unwrap(getApiV1ObservationsById({ path: { id: Number(id) } })));
    mockDb.observations.push(observation);
    return observation;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

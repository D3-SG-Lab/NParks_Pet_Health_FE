/**
 * Animal health timeline endpoints on the real backend (Postman "Animal Health Timeline (AQC)"). Used by
 * animalsApi.ts when EXPO_PUBLIC_API_URL is set.
 *
 * - GET /api/v1/animals/{stayId}/timeline  one stay's feed, newest first: exam, inspections, observations,
 *                                          case events and doses. Also records a "recently viewed" entry.
 * - GET /api/v1/animals/{stayId}/summary   the AI 30-day summary with citations (204 until one is generated)
 * - GET /api/v1/me/recent-animals          up to 3 stays the user viewed most recently, newest first
 *
 * Errors are thrown as ApiError.
 */
import { unwrap } from '@/api';
import { getApiV1AnimalsByStayIdSummary, getApiV1AnimalsByStayIdTimeline, getApiV1MeRecentAnimals } from '@/api/generated';
import type { AnimalAiSummaryResponse, TimelineEntryResponse } from '@/api/generated';
import type { AnimalSummary, SummaryCitation, TimelineEntry, TimelineKind } from '@/domain/types';

/** The server's kinds ("arrival-exam", "case-event", "medication-administration", …) as the app's. */
export function toTimelineKind(kind: string): TimelineKind | null {
  const k = kind.toLowerCase();
  if (k.includes('exam')) return 'exam';
  if (k.startsWith('inspection')) return 'inspection';
  if (k.startsWith('observation')) return 'observation';
  if (k.startsWith('medic') || k.includes('dose')) return 'medication';
  if (k.startsWith('case')) return 'case';
  return null;
}

/** Status words the server puts in `subLabel` for observations; they are not who recorded it. */
const STATUS_WORDS = new Set(['processing', 'ready', 'review', 'awaiting-confirmation', 'routed']);

const CASE_NUMBER = /C-\d{4}-\d+/;

function toEntry(dto: TimelineEntryResponse): TimelineEntry | null {
  const kind = toTimelineKind(dto.kind);
  if (!kind) return null;
  const sub = dto.subLabel?.trim() ?? '';
  const session = sub === 'AM' || sub === 'PM' ? sub : null;
  return {
    // Rows open the record they refer to.
    id: String(dto.referenceId ?? dto.id),
    kind,
    at: Date.parse(dto.occurredAt) || 0,
    session,
    title: dto.title,
    text: dto.detail ?? '',
    by: session || STATUS_WORDS.has(sub.toLowerCase()) ? '' : sub,
    media: [],
    abnormal: false,
    caseId: kind === 'case' ? (CASE_NUMBER.exec(`${dto.title} ${dto.detail ?? ''}`)?.[0] ?? null) : null,
  };
}

/** GET /animals/{stayId}/timeline, newest first. */
export async function loadTimeline(animalId: string): Promise<TimelineEntry[]> {
  const timeline = await unwrap(getApiV1AnimalsByStayIdTimeline({ path: { stayId: Number(animalId) } }));
  return timeline.entries.flatMap((dto) => toEntry(dto) ?? []).sort((a, b) => b.at - a.at);
}

export function toSummary(dto: AnimalAiSummaryResponse): AnimalSummary {
  // Citations are numbered across the whole summary; sources[refIndex - 1] is citation refIndex.
  const sources: SummaryCitation[] = [];
  const statements = dto.statements.map((statement) => {
    const refs = statement.citations.flatMap((citation) => {
      const ref = Number(citation.refIndex);
      const kind = toTimelineKind(citation.sourceKind);
      if (!Number.isInteger(ref) || ref < 1 || !kind) return [];
      sources[ref - 1] ??= { id: citation.sourceId, label: citation.label, kind };
      return [ref];
    });
    // The text carries the markers ("… [1]"); the screen shows refs as chips instead.
    return { text: statement.text.replace(/\s*\[\d+\]/g, '').trim(), refs };
  });
  return { statements, sources: Array.from(sources, (s) => s ?? { id: '', label: 'Source', kind: 'observation' }), updatedAt: Date.parse(dto.updatedAt) || Date.now() };
}

/** GET /animals/{stayId}/summary, or null when none has been generated yet (204). */
export async function loadSummary(animalId: string): Promise<AnimalSummary | null> {
  const summary = await unwrap(getApiV1AnimalsByStayIdSummary({ path: { stayId: Number(animalId) } }));
  return summary && typeof summary === 'object' && Array.isArray(summary.statements) ? toSummary(summary) : null;
}

/** GET /me/recent-animals: stay ids, newest first. */
export async function listRecentAnimalIds(): Promise<string[]> {
  const recent = await unwrap(getApiV1MeRecentAnimals());
  return recent.map((r) => String(r.stayId));
}

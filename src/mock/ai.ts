/**
 * MOCK AI. Rule-based stand-ins for animal matching (AI-002), sign extraction (AI-003), routing
 * suggestions (AI-004) and 30-day summaries (AI-005), so the confirmation, review-queue and profile
 * screens can be demonstrated without the AI service. Pure functions over the data they are given.
 */
import type {
  AiExtraction,
  AiMatch,
  AiResult,
  Animal,
  AnimalSummary,
  ClinicalSign,
  ClinicalSystem,
  FoodLevel,
  HealthCase,
  InspectionRecord,
  MedicationSchedule,
  RoutingAction,
  Severity,
  StoolType,
  SummaryCitation,
  TimelineEntry,
} from '@/domain/types';
import { addDaysIso, formatDayMonth, isoDateOf, isoToDdMm } from '@/utils/dates';

/** Matches below this confidence go to the review queue instead of straight to confirmation. */
export const CONFIDENCE_THRESHOLD = 0.75;

/** Closed cases within this many days are suggested for reopening when related signs come back. */
export const REOPEN_WINDOW_DAYS = 30;

const SIGN_PATTERNS: readonly { code: string; pattern: RegExp }[] = [
  { code: 'loose-stool', pattern: /\b(loose|diarrh(o)?ea|watery) (stool|poo)?|\bdiarrh(o)?ea\b/i },
  { code: 'soft-stool', pattern: /\bsoft (stool|poo)/i },
  { code: 'vomiting', pattern: /\bvomit(ed|ing|s)?\b|\bthrew up\b/i },
  { code: 'reduced-appetite', pattern: /\b(left|ate|eaten) (half|a little|little)\b|\b(didn'?t|did not|won'?t) (finish|eat)\b|\bappetite\b|\brefus(ed|ing) (food|to eat)\b|\boff (his|her|its) food\b/i },
  { code: 'sneezing', pattern: /\bsneez(e|ed|es|ing)\b/i },
  { code: 'nasal-discharge', pattern: /\bnasal discharge\b|\brunny nose\b/i },
  { code: 'coughing', pattern: /\bcough(ed|ing|s)?\b/i },
  { code: 'ear-scratching', pattern: /\bscratch(ing|es|ed)? (its|his|her|the|left|right)? ?(left |right )?ear/i },
  { code: 'head-shaking', pattern: /\bshak(e|es|ing) (its|his|her) head\b|\bhead shak/i },
  { code: 'scratching', pattern: /\bscratch(ing|es|ed)?\b|\bitch(y|ing)?\b/i },
  { code: 'hair-loss', pattern: /\bhair loss\b|\bbald (patch|spot)/i },
  { code: 'eye-discharge', pattern: /\beye discharge\b|\bdischarge from (the |her |his )?eye|\bgoopy eye/i },
  { code: 'red-eye', pattern: /\bred eye|\beye(s)? (is |are |look )?red/i },
  { code: 'lethargy', pattern: /\bletharg(ic|y)\b|\bquiet(er)? than usual\b|\bvery tired\b/i },
  { code: 'lameness', pattern: /\blimp(ing|s)?\b|\blame(ness)?\b/i },
];

const KENNEL_PATTERN = /\bKC\d-\d+\b/gi;

/** Finds the animal from kennel codes and names in the text (active stays only). */
export function matchAnimal(text: string, animals: readonly Animal[]): AiMatch | null {
  const active = animals.filter((animal) => animal.status === 'active-monitoring');
  const codes = (text.match(KENNEL_PATTERN) ?? []).map((code) => code.toUpperCase());
  const byKennel = active.find((animal) => codes.includes(animal.kennel));
  const byName = active.filter((animal) => new RegExp(`\\b${escapeRegExp(animal.name)}\\b`, 'i').test(text));

  if (byKennel && byName.some((animal) => animal.id === byKennel.id)) {
    return { animalId: byKennel.id, confidence: 0.96, selectedByUser: false };
  }
  if (byKennel && byName.length > 0) return { animalId: byKennel.id, confidence: 0.55, selectedByUser: false };
  if (byKennel) return { animalId: byKennel.id, confidence: 0.9, selectedByUser: false };
  if (byName.length === 1 && byName[0]) {
    // A name followed by "?" means the observer was unsure.
    const unsure = new RegExp(`\\b${escapeRegExp(byName[0].name)}\\?`, 'i').test(text);
    return { animalId: byName[0].id, confidence: unsure ? 0.61 : 0.84, selectedByUser: false };
  }
  if (byName.length > 1 && byName[0]) return { animalId: byName[0].id, confidence: 0.5, selectedByUser: false };
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extracts signs, food/stool values, onset and a severity cue from free text. */
export function extractSigns(text: string, taxonomy: readonly ClinicalSign[], now: number = Date.now()): AiExtraction {
  const codes = new Set<string>();
  for (const { code, pattern } of SIGN_PATTERNS) {
    if (pattern.test(text)) codes.add(code);
  }
  // Ear scratching is more specific than general scratching.
  if (codes.has('ear-scratching')) codes.delete('scratching');
  if (codes.has('loose-stool')) codes.delete('soft-stool');
  const signs = taxonomy.filter((sign) => codes.has(sign.code));

  const food: FoodLevel | null = /\b(didn'?t|did not|won'?t) eat\b|\brefus(ed|ing)\b|\bnothing\b/i.test(text)
    ? 'None'
    : /\b(a little|little)\b/i.test(text)
      ? 'Little'
      : /\bhalf\b|\bdidn'?t finish\b|\bleft (some|the rest)\b/i.test(text)
        ? 'Half'
        : /\b(eating well|ate (all|everything)|finished)\b/i.test(text)
          ? 'Full'
          : null;
  const stool: StoolType | null = codes.has('loose-stool') ? 'Loose' : codes.has('soft-stool') ? 'Soft' : /\bfirm stool/i.test(text) ? 'Firm' : null;
  const severity: Severity = /\b(severe|blood|bloody|collapsed|not moving)\b/i.test(text)
    ? 'severe'
    : /\b(moderate|again|several|repeated|keeps)\b/i.test(text)
      ? 'moderate'
      : 'mild';
  const today = isoDateOf(now);
  const onsetDate = /\byesterday\b/i.test(text) ? addDaysIso(today, -1) : today;
  return { signs, food, stool, onsetDate, severity };
}

/** Compares the signs with the animal's cases and suggests how to route the observation. */
export function suggestRouting(
  signs: readonly ClinicalSign[],
  animalId: string | null,
  cases: readonly HealthCase[],
  now: number = Date.now(),
): AiResult['suggestion'] {
  if (signs.length === 0) {
    return { action: 'timeline-only', caseId: null, rationale: 'No clinical signs found. Add it to the 30-day timeline.' };
  }
  const systems = new Set<ClinicalSystem>(signs.map((s) => s.system));
  const mainSystem = signs[0]?.system ?? 'General';
  if (!animalId) {
    return { action: 'new-case', caseId: null, rationale: `New ${mainSystem} signs. Pick the animal to check its cases.` };
  }
  const animalCases = cases.filter((c) => c.animalId === animalId);
  const open = animalCases.find((c) => c.status !== 'closed' && systems.has(c.system));
  if (open) {
    return {
      action: 'update-case',
      caseId: open.id,
      rationale: `Signs match open ${open.system} case opened ${formatDayMonth(open.openedAt)}.`,
    };
  }
  const windowStart = now - REOPEN_WINDOW_DAYS * 24 * 60 * 60_000;
  const recentlyClosed = animalCases
    .filter((c) => c.status === 'closed' && systems.has(c.system) && (c.closedAt ?? 0) >= windowStart)
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))[0];
  if (recentlyClosed) {
    return {
      action: 'reopen-case',
      caseId: recentlyClosed.id,
      rationale: `Related signs within ${REOPEN_WINDOW_DAYS} days of case ${recentlyClosed.id}, closed ${formatDayMonth(recentlyClosed.closedAt ?? now)}.`,
    };
  }
  return { action: 'new-case', caseId: null, rationale: `New ${mainSystem} signs with no open case.` };
}

/** Full mock AI pass over an observation. */
export function analyseObservation(input: {
  text: string;
  chosenAnimalId: string | null;
  animals: readonly Animal[];
  cases: readonly HealthCase[];
  taxonomy: readonly ClinicalSign[];
  now?: number;
  /** Reported processing time. */
  durationSec?: number;
}): AiResult {
  const now = input.now ?? Date.now();
  const match: AiMatch | null = input.chosenAnimalId
    ? { animalId: input.chosenAnimalId, confidence: 1, selectedByUser: true }
    : matchAnimal(input.text, input.animals);
  const extraction = extractSigns(input.text, input.taxonomy, now);
  // Food or stool values alone still count as GI signs.
  if (extraction.signs.length === 0) {
    const implied = extraction.stool === 'Soft' || extraction.stool === 'Loose'
      ? input.taxonomy.find((s) => s.code === (extraction.stool === 'Loose' ? 'loose-stool' : 'soft-stool'))
      : extraction.food && extraction.food !== 'Full'
        ? input.taxonomy.find((s) => s.code === 'reduced-appetite')
        : undefined;
    if (implied) extraction.signs = [implied];
  }
  const suggestion = suggestRouting(extraction.signs, match?.animalId ?? null, input.cases, now);
  const candidates = match && match.confidence >= CONFIDENCE_THRESHOLD ? [] : candidateAnimals(input.text, input.animals, match?.animalId ?? null);
  return { match, candidates, extraction, suggestion, processedAt: now, durationSec: input.durationSec ?? Math.round(AI_PROCESSING_MS / 1000) };
}

/** Simulated AI processing time (instant under Jest). */
export const AI_PROCESSING_MS = process.env.NODE_ENV === 'test' ? 0 : 3000;

/**
 * Possible animals when there is no confident match: same species and kennel block if the text
 * mentions them (e.g. "small brown dog in KC2"), best first, with falling confidence.
 */
export function candidateAnimals(text: string, animals: readonly Animal[], exclude: string | null): AiResult['candidates'] {
  const lower = text.toLowerCase();
  const species = /\bdog\b/.test(lower) ? 'Dog' : /\bcat\b/.test(lower) ? 'Cat' : null;
  const block = (text.match(/\bKC\d\b/i) ?? [])[0]?.toUpperCase() ?? null;
  return animals
    .filter((a) => a.status === 'active-monitoring' && a.id !== exclude)
    .filter((a) => (species ? a.species === species : true) && (block ? a.kennel.startsWith(`${block}-`) : true))
    .slice(0, 2)
    .map((a, index) => ({ animalId: a.id, confidence: index === 0 ? 0.48 : 0.31 }));
}

export function needsReview(result: AiResult): boolean {
  return !result.match || result.match.confidence < CONFIDENCE_THRESHOLD;
}

export function confidenceLabel(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.9) return 'High';
  if (confidence >= CONFIDENCE_THRESHOLD) return 'Medium';
  return 'Low';
}

export const ROUTING_LABELS: Record<RoutingAction, string> = {
  'timeline-only': 'Add to 30-day timeline only',
  'update-case': 'Add to timeline & update open case',
  'new-case': 'Create a new case',
  'reopen-case': 'Reopen closed case',
};

interface SummaryInputs {
  /** Timeline entries for the stay (any order). */
  entries: readonly TimelineEntry[];
  cases: readonly HealthCase[];
  inspections: readonly InspectionRecord[];
  schedules: readonly MedicationSchedule[];
  now?: number;
}

/**
 * 30-day clinical summary from the animal's own records (AI-005): short statements, each citing at
 * least one source record by number ("GI upset since 14/10 — 4 observations in 7 days [1] [2]").
 */
export function summariseAnimal({ entries, cases, inspections, schedules, now = Date.now() }: SummaryInputs): AnimalSummary {
  const day = 24 * 60 * 60_000;
  const recent = entries.filter((entry) => entry.at >= now - 30 * day);
  const abnormal = recent.filter((entry) => entry.abnormal).sort((a, b) => a.at - b.at);
  const openCases = cases.filter((c) => c.status !== 'closed');

  const sources: SummaryCitation[] = [];
  const cite = (entry: { id: string; kind: SummaryCitation['kind']; label: string }): number => {
    const existing = sources.findIndex((s) => s.id === entry.id);
    if (existing >= 0) return existing + 1;
    sources.push(entry);
    return sources.length;
  };
  const citeEntry = (entry: TimelineEntry) =>
    cite({
      id: entry.id,
      kind: entry.kind,
      label: `${entry.kind === 'inspection' ? 'Insp' : entry.kind === 'observation' ? 'Obs' : entry.kind === 'medication' ? 'Med' : 'Rec'} ${formatDayMonth(entry.at)}${entry.session ? ` ${entry.session}` : ''}`,
    });
  const statements: AnimalSummary['statements'] = [];

  if (abnormal.length === 0) {
    const checks = recent.filter((entry) => entry.kind === 'inspection');
    const latest = checks.at(-1) ?? recent.at(-1);
    statements.push({ text: 'No abnormal findings in the last 30 days', refs: [] });
    statements.push({ text: `${checks.length} daily inspections recorded, all normal`, refs: latest ? [citeEntry(latest)] : [] });
  } else {
    const first = abnormal[0];
    const weekObservations = abnormal.filter((e) => e.kind === 'observation' && e.at >= now - 7 * day);
    const focus = openCases[0];
    const latestObservation = weekObservations.at(-1);
    statements.push({
      text: `${focus ? `${focus.system} upset` : 'Abnormal findings'} since ${formatDayMonth(first?.at ?? now)} — ${weekObservations.length} ${weekObservations.length === 1 ? 'observation' : 'observations'} in 7 days`,
      refs: [first ? citeEntry(first) : 0, latestObservation ? citeEntry(latestObservation) : 0].filter((ref, i, list) => ref > 0 && list.indexOf(ref) === i),
    });
  }

  // Food intake over the last four inspected days.
  const lastFourDays = [...inspections].sort((a, b) => b.recordedAt - a.recordedAt).filter((i) => i.recordedAt >= now - 4 * day);
  const lowIntake = lastFourDays.filter((i) => i.food !== 'Full');
  const daysWithLow = new Set(lowIntake.map((i) => i.date)).size;
  if (daysWithLow > 0) {
    const sample = lowIntake[0];
    const entry = sample ? entries.find((e) => e.id === sample.id) : undefined;
    statements.push({
      text: `Food intake “${sample?.food ?? 'Half'}” on ${daysWithLow} of the last 4 days`,
      refs: entry ? [citeEntry(entry)] : [],
    });
  }

  // Current medication.
  const today = isoDateOf(now);
  for (const schedule of schedules.filter((s) => s.startDate <= today && s.endDate >= today).slice(0, 2)) {
    const given = entries.filter((e) => e.kind === 'medication' && e.title.startsWith(schedule.item)).sort((a, b) => a.at - b.at)[0];
    statements.push({
      text: `On ${schedule.item.toLowerCase()} ${schedule.dose} ${schedule.times.length}x daily since ${isoToDdMm(schedule.startDate)}`,
      refs: given ? [citeEntry(given)] : [],
    });
  }

  for (const c of openCases) cite({ id: c.id, kind: 'case', label: `Case ${c.id}` });
  return { statements, sources, updatedAt: now };
}

/** One-paragraph AI case summary from the case history. */
export function summariseCase(healthCase: HealthCase, now: number = Date.now()): string {
  const weekAgo = now - 7 * 24 * 60 * 60_000;
  // Any event tied to an observation or inspection, including the one that opened or reopened the case.
  const linked = healthCase.events.filter((e) => e.observationId || e.inspectionId);
  const lastWeek = linked.filter((e) => e.at >= weekAgo).length;
  const latest = [...healthCase.events].reverse().find((e) => e.kind !== 'assigned' && e.kind !== 'note');
  const base = `${healthCase.finding} since ${formatDayMonth(healthCase.openedAt)}, ${lastWeek} linked ${lastWeek === 1 ? 'record' : 'records'} in 7 days.`;
  if (healthCase.status === 'closed') return `${base} Closed ${formatDayMonth(healthCase.closedAt ?? now)}: ${healthCase.closeReason ?? 'no reason given'}.`;
  return latest ? `${base} Latest: ${latest.detail ?? latest.title} (${formatDayMonth(latest.at)}).` : base;
}
/**
 * Arrival endpoints on the real backend (used by arrivalApi.ts when EXPO_PUBLIC_API_URL is set).
 *
 * Integrated: GET /kennels, GET /countries, GET /animals (kennel occupants, microchip check),
 * POST /animals (create the stay), POST /animals/{stayId}/exam, GET / DELETE /arrival-draft and
 * PUT /arrival-draft/exam.
 *
 * Gaps in the backend, handled here until they exist:
 * - No endpoint saves the animal-details half of the draft, so it is kept on the device; the exam half
 *   is mirrored to PUT /arrival-draft/exam.
 * - No endpoint lists AQC vets, so the vet picker stays on demo data and vetStaffId is sent only when the
 *   picked id is numeric (a real staff id).
 * - POST /animals has no releaseDate, so the expected release date is not sent.
 * - Exam photos are placeholders until the media upload API exists, so photoKeys is always empty.
 */
import { ApiError, unwrap } from '@/api';
import {
  deleteApiV1ArrivalDraft,
  getApiV1Animals,
  getApiV1ArrivalDraft,
  getApiV1Countries,
  getApiV1Kennels,
  postApiV1Animals,
  postApiV1AnimalsByStayIdExam,
  putApiV1ArrivalDraftExam,
} from '@/api/generated';
import type { AnimalStayResponse, ArrivalExamFindingInput, ArrivalExamResponse, AqcKennelResponse } from '@/api/generated';
import {
  EXAM_SYSTEMS,
  MENTATIONS,
  SEXES,
  SPECIES,
  type Animal,
  type ArrivalDetailsInput,
  type ArrivalDraft,
  type ArrivalExamInput,
  type ArrivalExamRecord,
  type Country,
  type ExamFinding,
  type ExamSystem,
} from '@/domain/types';
import { parseDdMmYyyy, todayIso } from '@/utils/dates';

import { ArrivalError } from './arrivalError';

/** Same shape as arrivalApi's KennelOption (kept separate to avoid an import cycle). */
interface KennelOptionShape {
  code: string;
  block: string;
  occupant: string | null;
}

const listKennels = () => unwrap(getApiV1Kennels({ query: { isActive: true } }));
const listStayingAnimals = (search?: string) => unwrap(getApiV1Animals({ query: { status: 'staying', search } }));

export async function listKennelOptions(): Promise<KennelOptionShape[]> {
  const [kennels, animals] = await Promise.all([listKennels(), listStayingAnimals()]);
  return kennels.map((kennel) => ({
    code: kennel.code,
    block: kennel.block,
    occupant: animals.find((animal) => String(animal.kennelId) === String(kennel.id))?.name ?? null,
  }));
}

export async function listCountries(): Promise<Country[]> {
  const countries = await unwrap(getApiV1Countries({ query: { isActive: true } }));
  return countries.map(({ code, name }) => ({ code, name }));
}

export async function isMicrochipTaken(microchip: string): Promise<boolean> {
  const chip = microchip.trim();
  const matches = await listStayingAnimals(chip);
  return matches.some((animal) => animal.microchip === chip);
}

// --- Draft ------------------------------------------------------------------------------------------

function toExamDraftBody(exam: ArrivalExamInput | null) {
  if (!exam) return { vetStaffId: null, weightKg: null, mentation: null, findings: null };
  const weight = Number(exam.weightKg.trim());
  return {
    vetStaffId: toStaffId(exam.vetId),
    weightKg: exam.weightKg.trim() && Number.isFinite(weight) ? weight : null,
    mentation: exam.mentation,
    findings: toFindings(exam),
  };
}

/** Mirrors the exam half of the draft to the server. */
export async function saveExamDraft(exam: ArrivalExamInput | null): Promise<void> {
  await unwrap(putApiV1ArrivalDraftExam({ body: toExamDraftBody(exam) }));
}

export async function deleteDraft(): Promise<void> {
  await unwrap(deleteApiV1ArrivalDraft());
}

/**
 * The server copy of the draft, or null when there is none. Only a draft with animal details is useful
 * (the exam step needs them), so an exam-only draft counts as none.
 */
export async function loadDraft(): Promise<ArrivalDraft | null> {
  try {
    const draft = await unwrap(getApiV1ArrivalDraft());
    const details = fromDetailsJson(draft.detailsJson);
    if (!details) return null;
    return { details, exam: fromExamJson(draft.examJson), updatedAt: Date.parse(draft.updatedAt) || Date.now() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  return values.find((v) => v === value) ?? null;
}

function fromDetailsJson(json: unknown): ArrivalDetailsInput | null {
  const value = record(json);
  if (!value) return null;
  return {
    name: text(value.name),
    kennel: text(value.kennel) || null,
    species: oneOf(SPECIES, value.species) ?? 'Dog',
    countryCode: text(value.countryCode) || null,
    microchip: text(value.microchip),
    sex: oneOf(SEXES, value.sex),
    dateOfBirth: text(value.dateOfBirth),
    releaseDate: text(value.releaseDate),
  };
}

function fromExamJson(json: unknown): ArrivalExamInput | null {
  const value = record(json);
  if (!value) return null;
  const findings = Array.isArray(value.findings) ? value.findings.map(record).filter((f) => f !== null) : [];
  const bySystem = Object.fromEntries(
    EXAM_SYSTEMS.map((system): [ExamSystem, ExamFinding] => {
      const finding = findings.find((f) => f.system === system);
      return [system, { abnormal: finding?.abnormal === true, note: text(finding?.note), photos: [] }];
    }),
  ) as Record<ExamSystem, ExamFinding>;
  return {
    vetId: value.vetStaffId === null || value.vetStaffId === undefined ? null : String(value.vetStaffId),
    weightKg: typeof value.weightKg === 'number' ? String(value.weightKg) : text(value.weightKg),
    mentation: oneOf(MENTATIONS, value.mentation) ?? 'Responsive',
    findings: bySystem,
  };
}

// --- Complete arrival -------------------------------------------------------------------------------

function toStaffId(vetId: string | null): number | null {
  return vetId && /^\d+$/.test(vetId) ? Number(vetId) : null;
}

function toFindings(exam: ArrivalExamInput): ArrivalExamFindingInput[] {
  return EXAM_SYSTEMS.map((system) => {
    const finding = exam.findings[system];
    return { system, abnormal: finding.abnormal, note: finding.note.trim() || null, photoKeys: [] };
  });
}

/** The app's exam record for GET /animals/{stayId}/exam (also shown on the animal's timeline). */
export function toExamRecord(exam: ArrivalExamResponse): ArrivalExamRecord {
  const input = fromExamJson(exam) as ArrivalExamInput;
  return { ...input, id: `exam-${exam.id}`, animalId: String(exam.stayId), examinedAt: Date.parse(exam.examinedAt) || Date.now() };
}

/** The app's Animal for a stay the backend returned. The first daily inspections are still due. */
export function toAnimal(stay: AnimalStayResponse, examDone = true): Animal {
  return {
    id: String(stay.id),
    name: stay.name,
    kennel: stay.kennelCode,
    species: oneOf(SPECIES, stay.species) ?? 'Other',
    sex: oneOf(SEXES, stay.sex) ?? 'Unknown',
    countryCode: stay.countryCode ?? '',
    microchip: stay.microchip,
    dateOfBirth: stay.dateOfBirth,
    arrivalDate: stay.arrivalDate,
    releaseDate: stay.releaseDate,
    status: 'active-monitoring',
    today: { arrivalExam: examDone ? 'done' : 'due', amInspection: 'due', pmInspection: 'due' },
  };
}

/**
 * Stays created on the server whose exam has not gone through yet, by microchip. A retry after a failed
 * exam submit reuses the stay instead of hitting "microchip already registered".
 */
const pendingStays = new Map<string, AnimalStayResponse>();

/** Creates the stay (POST /animals), then its baseline exam (POST /animals/{stayId}/exam). */
export async function completeArrival(details: ArrivalDetailsInput, exam: ArrivalExamInput): Promise<AnimalStayResponse> {
  const microchip = details.microchip.trim();
  let stay = pendingStays.get(microchip);
  if (!stay) {
    const kennel: AqcKennelResponse | undefined = (await listKennels()).find((k) => k.code === details.kennel);
    if (!kennel) throw new ArrivalError('incomplete', `Kennel ${details.kennel} is no longer available. Pick another kennel.`);
    try {
      stay = await unwrap(
        postApiV1Animals({
          body: {
            name: details.name.trim(),
            kennelId: kennel.id,
            species: details.species,
            sex: details.sex,
            countryCode: details.countryCode,
            microchip,
            dateOfBirth: parseDdMmYyyy(details.dateOfBirth)?.iso ?? null,
            arrivalDate: todayIso(),
          },
        }),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) throw new ArrivalError('microchip_taken', error.message);
      throw error;
    }
    pendingStays.set(microchip, stay);
  }

  const { vetStaffId, weightKg } = toExamDraftBody(exam);
  try {
    await unwrap(
      postApiV1AnimalsByStayIdExam({
        path: { stayId: Number(stay.id) },
        body: { vetStaffId, weightKg, mentation: exam.mentation, findings: toFindings(exam) },
      }),
    );
  } catch (error) {
    // 409: the exam was already saved by an earlier attempt whose response was lost.
    if (!(error instanceof ApiError && error.status === 409)) throw error;
  }
  pendingStays.delete(microchip);
  return stay;
}

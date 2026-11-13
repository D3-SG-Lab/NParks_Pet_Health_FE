/**
 * Daily inspection endpoints on the real backend (Postman "Daily Inspection (AQC)"), for animals that come
 * from the backend. Used by inspectionApi.ts and animalSource.ts when EXPO_PUBLIC_API_URL is set.
 *
 * - POST /api/v1/animals/{stayId}/inspections   submit (one AM and one PM per stay per day; 409 otherwise)
 * - GET  /api/v1/animals/{stayId}/inspections   the stay's inspections (optionally ?date=YYYY-MM-DD)
 * - GET  /api/v1/animals/inspections/{id}       one inspection (record detail sheet)
 *
 * Errors are thrown as ApiError; inspectionApi.ts turns them into InspectionError for the screens.
 * Routing abnormal findings (link to an open case or send to AI triage) has no endpoint yet and stays mocked.
 */
import { ApiError, unwrap } from '@/api';
import {
  getApiV1AnimalsByStayIdInspections,
  getApiV1AnimalsInspectionsByInspectionId,
  postApiV1AnimalsByStayIdInspections,
} from '@/api/generated';
import type { DailyInspectionResponse } from '@/api/generated';
import {
  FOOD_LEVELS,
  INSPECTION_SESSIONS,
  INSPECTION_SYSTEMS,
  MENTATIONS,
  STOOL_TYPES,
  URINE_VALUES,
  type FindingValue,
  type InspectionInput,
  type InspectionRecord,
  type InspectionSession,
  type InspectionSystem,
} from '@/domain/types';
import { mockDb } from '@/mock/db';

function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return values.find((v) => v === value) ?? fallback;
}

/**
 * The app's record for an inspection the backend returned. Systems the response leaves out count as
 * normal (the form defaults every system to Normal). `recordedBy` is a user id; the name is only known
 * for the signed-in user's own submissions.
 */
export function toInspectionRecord(dto: DailyInspectionResponse, recordedByName?: string): InspectionRecord {
  const systems = Object.fromEntries(
    INSPECTION_SYSTEMS.map((system): [InspectionSystem, FindingValue] => [
      system,
      dto.systemFindings.find((f) => f.system === system)?.finding === 'abnormal' ? 'abnormal' : 'normal',
    ]),
  ) as Record<InspectionSystem, FindingValue>;
  return {
    id: String(dto.id),
    animalId: String(dto.stayId),
    date: dto.inspectionDate,
    session: oneOf(INSPECTION_SESSIONS, dto.session, 'AM'),
    mentation: oneOf(MENTATIONS, dto.mentation, 'Responsive'),
    food: oneOf(FOOD_LEVELS, dto.food, 'Full'),
    stool: oneOf(STOOL_TYPES, dto.stool, 'Firm'),
    urine: oneOf(URINE_VALUES, dto.urine, 'Yes'),
    otherFindings: dto.otherFindings ?? '',
    systems,
    recordedAt: Date.parse(dto.recordedAt) || Date.now(),
    recordedBy: recordedByName ?? `Staff #${dto.recordedBy}`,
  };
}

/** Replaces the store's inspections of one backend stay with the server's. */
export async function loadInspections(animalId: string): Promise<InspectionRecord[]> {
  const list = await unwrap(getApiV1AnimalsByStayIdInspections({ path: { stayId: Number(animalId) } }));
  const records = list.map((dto) => toInspectionRecord(dto, mockDb.inspections.find((i) => i.id === String(dto.id))?.recordedBy));
  mockDb.inspections = [...mockDb.inspections.filter((i) => i.animalId !== animalId), ...records];
  return records;
}

export async function submitInspection(
  animalId: string,
  session: InspectionSession,
  date: string,
  input: InspectionInput,
  recordedByName: string,
): Promise<InspectionRecord> {
  const dto = await unwrap(
    postApiV1AnimalsByStayIdInspections({
      path: { stayId: Number(animalId) },
      body: {
        session,
        inspectionDate: date,
        mentation: input.mentation,
        food: input.food,
        stool: input.stool,
        urine: input.urine,
        otherFindings: input.otherFindings.trim() || null,
        systemFindings: INSPECTION_SYSTEMS.map((system) => ({ system, finding: input.systems[system] })),
      },
    }),
  );
  return toInspectionRecord(dto, recordedByName);
}

/** One inspection, or null when the server has none with that id. */
export async function getInspection(id: string): Promise<InspectionRecord | null> {
  try {
    const dto = await unwrap(getApiV1AnimalsInspectionsByInspectionId({ path: { inspectionId: Number(id) } }));
    return toInspectionRecord(dto, mockDb.inspections.find((i) => i.id === id)?.recordedBy);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

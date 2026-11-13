/**
 * Endpoints in the Postman collection (docs/NParksPetHealth_API.postman_collection.json) that the
 * server's OpenAPI spec does not list yet, so they are not in src/api/generated/. Typed by hand from the
 * collection's request and response examples, and sent through the same generated client (base URL,
 * bearer token). Once the spec includes them, run `npm run api:spec && npm run api:generate` and switch
 * the callers to the generated functions.
 */
import { client } from './generated/client.gen';

// --- Medication (AQC) -----------------------------------------------------------------------------

/** The animal as the medication endpoints return it (already in the app's Animal shape, numeric id). */
export interface MedicationAnimalDto {
  id: number | string;
  name: string;
  kennel: string;
  species: string;
  sex: string;
  countryCode: string;
  microchip: string;
  dateOfBirth: string | null;
  arrivalDate: string;
  releaseDate: string | null;
  status: string;
  today: { arrivalExam: string; amInspection: string; pmInspection: string };
}

/** GET /api/v1/medication/animals?date= item. */
export interface MedicationAnimalItemDto {
  animal: MedicationAnimalDto;
  scheduleCount: number;
  dueCount: number;
  overdueCount: number;
}

/** POST /api/v1/medication/administrations response, and `slots[].administration`. */
export interface MedicationAdministrationDto {
  id: number | string;
  scheduleId: number | string;
  animalId: number | string;
  /** `YYYY-MM-DDTHH:MM`, local. */
  slot: string;
  /** Epoch milliseconds. */
  administeredAt: number;
  by: string;
  remarks: string | null;
}

export interface DoseSlotDto {
  slot: string;
  scheduleId: number | string;
  item: string;
  dose: string;
  frequency: string;
  startDate: string;
  endDate: string;
  time: string;
  status: string;
  administration: MedicationAdministrationDto | null;
}

/** GET /api/v1/animals/{stayId}/medication?date= response. */
export interface MedicationDayDto {
  animal: MedicationAnimalDto;
  scheduleCount: number;
  slots: DoseSlotDto[];
}

export interface RecordAdministrationRequest {
  scheduleId: number;
  slot: string;
  remarks: string | null;
}

/** Animals with an active medication schedule on `date` (YYYY-MM-DD); overdue first, scoped server-side. */
export const listMedicationAnimals = (date: string) =>
  client.get<{ 200: MedicationAnimalItemDto[] }, unknown, false>({ url: '/api/v1/medication/animals', query: { date } });

/** Every dose slot of one animal on `date`, with its computed status. */
export const getAnimalMedicationDay = (stayId: number, date: string) =>
  client.get<{ 200: MedicationDayDto }, unknown, false>({ url: '/api/v1/animals/{stayId}/medication', path: { stayId }, query: { date } });

/** Records one dose; the server captures the time and the user. A second record for the slot is a 409. */
export const recordMedicationAdministration = (body: RecordAdministrationRequest) =>
  client.post<{ 201: MedicationAdministrationDto }, unknown, false>({
    url: '/api/v1/medication/administrations',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

// --- Notifications (AQC) --------------------------------------------------------------------------

export type PushPlatform = 'android' | 'ios';

/** Registers or replaces this staff member's FCM/APNs token for the platform. */
export const registerPushToken = (body: { token: string; platform: PushPlatform }) =>
  client.put<{ 204: void }, unknown, false>({ url: '/api/v1/me/push-token', body, headers: { 'Content-Type': 'application/json' } });

/** Revokes the platform's push token (call on sign-out). Idempotent. */
export const revokePushToken = (platform: PushPlatform) =>
  client.delete<{ 204: void }, unknown, false>({ url: '/api/v1/me/push-token', query: { platform } });

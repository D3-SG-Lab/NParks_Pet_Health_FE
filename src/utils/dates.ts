/** Date helpers for the DD/MM/YYYY inputs used in the wireframes. Pure and timezone independent. */

export interface ParsedDate {
  day: number;
  month: number;
  year: number;
  /** ISO calendar date, YYYY-MM-DD. */
  iso: string;
}

const pad = (value: number, length: number) => String(value).padStart(length, '0');

/** Parses DD/MM/YYYY. Returns null for a wrong format or an impossible calendar date (e.g. 31/02). */
export function parseDdMmYyyy(text: string): ParsedDate | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return { day, month, year, iso: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` };
}

/** Formats an ISO date (YYYY-MM-DD) as DD/MM/YYYY. */
export function isoToDdMmYyyy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Inserts slashes while typing: "01012020" becomes "01/01/2020". Non-digits are dropped. */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Today's local calendar date as ISO. */
export function todayIso(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

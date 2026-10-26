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

/** Local calendar date (ISO) of an epoch-milliseconds timestamp. */
export function isoDateOf(ms: number): string {
  return todayIso(new Date(ms));
}

/** Adds whole days to an ISO date. */
export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/** Formats an ISO date (YYYY-MM-DD) as DD/MM. */
export function isoToDdMm(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** HH:MM (24 h, local time). */
export function formatTime(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`;
}

/** DD/MM (local time). */
export function formatDayMonth(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getDate(), 2)}/${pad(date.getMonth() + 1, 2)}`;
}

/** DD/MM HH:MM (local time). */
export function formatDateTime(ms: number): string {
  return `${formatDayMonth(ms)} ${formatTime(ms)}`;
}

/** Epoch milliseconds for an ISO date at HH:MM local time. */
export function msAt(iso: string, time: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0).getTime();
}

/** "just now", "5 min ago", "3 h ago", "yesterday", else DD/MM. */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (isoDateOf(ms) === isoDateOf(now)) return `${Math.floor(minutes / 60)} h ago`;
  if (isoDateOf(ms) === addDaysIso(isoDateOf(now), -1)) return 'yesterday';
  return formatDayMonth(ms);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "Wed 21 Oct". */
export function formatWeekdayDate(ms: number): string {
  const date = new Date(ms);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Day heading for timelines: "Today · 21 Oct", "Yesterday · 20 Oct", else "Mon 19 Oct". */
export function dayHeading(ms: number, now: number = Date.now()): string {
  const date = new Date(ms);
  const short = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  if (isoDateOf(ms) === isoDateOf(now)) return `Today · ${short}`;
  if (isoDateOf(ms) === addDaysIso(isoDateOf(now), -1)) return `Yesterday · ${short}`;
  return formatWeekdayDate(ms);
}

/** The daily inspection session for a time of day: AM before noon, PM after. */
export function sessionFor(now: Date = new Date()): 'AM' | 'PM' {
  return now.getHours() < 12 ? 'AM' : 'PM';
}

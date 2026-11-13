/** Failed API call. `status` is 0 when the request never reached the server (offline, DNS, CORS). */
export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable reason when the server sends one, e.g. "already_recorded". */
  readonly kind: string | null;
  /** The request field a validation error is about, e.g. "platform". */
  readonly field: string | null;

  constructor(status: number, message: string, kind: string | null = null, field: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.field = field;
  }

  /** The server rejected the request (4xx): its message says what to fix, so it is safe to show. */
  get rejected(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * The backend answers errors in several shapes; returns the most useful message:
 * - `{ error: "Animal stay not found." }`
 * - `{ error: "MedicationError", kind: "already_recorded", message: "Dose already recorded for this slot." }`
 * - `{ error: "validation-error", message: "Platform must be 'android' or 'ios'.", field: "platform" }`
 * - ASP.NET ProblemDetails: `{ title, detail, errors: { Field: ["…"] } }`
 */
export function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const value = body as Record<string, unknown>;
    // When both are present, `error` is a code and `message` the sentence for people.
    const message = text(value.message) ?? text(value.error);
    if (message) return message;
    if (value.errors && typeof value.errors === 'object') {
      const first = Object.values(value.errors as Record<string, unknown>).flat().find((m) => typeof m === 'string');
      if (typeof first === 'string') return first;
    }
    const problem = text(value.detail) ?? text(value.title);
    if (problem) return problem;
  }
  if (status === 0) return 'Couldn’t reach the server. Check your connection.';
  return `The server returned an error (${status}).`;
}

function errorDetails(body: unknown): { kind: string | null; field: string | null } {
  if (!body || typeof body !== 'object') return { kind: null, field: null };
  const value = body as Record<string, unknown>;
  return { kind: text(value.kind), field: text(value.field) };
}

interface ClientResult<T> {
  data?: T;
  error?: unknown;
  response?: Response;
}

/** Returns the data of a generated SDK call, or throws an ApiError with the server's message. */
export async function unwrap<T>(call: Promise<ClientResult<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (response?.ok) return data as T;
  const status = response?.status ?? 0;
  const { kind, field } = errorDetails(error);
  throw new ApiError(status, errorMessage(error, status), kind, field);
}

/** The message to show for a failed save: the server's reason when it rejected the request, else `fallback`. */
export function rejectionMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.rejected ? error.message : fallback;
}

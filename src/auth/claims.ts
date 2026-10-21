import type { Session, StoredSession, UserRole } from './types';

export type Claims = Record<string, unknown>;

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const percentEncoded = Array.from(binary, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  try {
    return decodeURIComponent(percentEncoded);
  } catch {
    return binary;
  }
}

/**
 * Decodes a JWT payload WITHOUT verifying the signature. This is only for reading display data
 * and the role for UI visibility; the backend must verify tokens and enforce roles itself.
 */
export function decodeJwtPayload(token: string | undefined): Claims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const parsed: unknown = JSON.parse(base64UrlDecode(parts[1]));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Claims) : null;
  } catch {
    return null;
  }
}

function toRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'officer') return 'officer';
  if (v === 'contractor') return 'contractor';
  return null;
}

/** Reads a role from a string or string-array claim. If both roles appear, the lower-privilege one wins. */
export function extractRole(claims: Claims, claimName: string): UserRole | null {
  const raw = claims[claimName];
  const values: unknown[] = Array.isArray(raw) ? raw : [raw];
  const roles = values.map(toRole).filter((r): r is UserRole => r !== null);
  if (roles.includes('contractor')) return 'contractor';
  if (roles.includes('officer')) return 'officer';
  return null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Builds the UI session from stored tokens. Returns null when no valid role claim is present. */
export function buildSession(stored: StoredSession, roleClaim: string): Session | null {
  const idClaims = decodeJwtPayload(stored.idToken);
  const accessClaims = decodeJwtPayload(stored.accessToken);
  const role =
    (idClaims ? extractRole(idClaims, roleClaim) : null) ?? (accessClaims ? extractRole(accessClaims, roleClaim) : null);
  if (!role) return null;
  const claims: Claims = { ...(accessClaims ?? {}), ...(idClaims ?? {}) };
  return {
    role,
    provider: stored.provider,
    userId: str(claims.sub),
    name: str(claims.name),
    email: str(claims.email),
    expiresAt: stored.expiresAt,
    mock: stored.mock,
  };
}

/**
 * Typed environment config. Only EXPO_PUBLIC_ variables reach the bundle, so never put secrets here.
 * Each variable is referenced literally so Expo can inline it at build time.
 */

import type { UserRole } from '@/auth/types';

export type AuthMode = 'oidc' | 'mock';

export interface ProviderEnv {
  issuer: string | undefined;
  clientId: string | undefined;
  redirectScheme: string | undefined;
}

export interface AppEnv {
  apiUrl: string | undefined;
  authMode: AuthMode;
  /** Development auth bypass role, if set. Read it through isAuthBypassEnabled(). */
  authBypassRole: UserRole | undefined;
  sessionIdleMinutes: number;
  roleClaim: string;
  officer: ProviderEnv;
  contractor: ProviderEnv;
}

/** TEMPORARY default until the agreed idle timeout is decided (outstanding). */
export const DEFAULT_SESSION_IDLE_MINUTES = 15;
export const DEFAULT_ROLE_CLAIM = 'role';

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseIdleMinutes(raw: string | undefined): number {
  const parsed = Number(clean(raw));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_IDLE_MINUTES;
}

export function parseAuthMode(raw: string | undefined): AuthMode {
  return clean(raw)?.toLowerCase() === 'mock' ? 'mock' : 'oidc';
}

/** "officer" or "contractor" turns the development auth bypass on as that role; anything else leaves it off. */
export function parseAuthBypass(raw: string | undefined): UserRole | undefined {
  const value = clean(raw)?.toLowerCase();
  return value === 'officer' || value === 'contractor' ? value : undefined;
}

const authBypassRole = parseAuthBypass(process.env.EXPO_PUBLIC_AUTH_BYPASS);

export const env: AppEnv = {
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL),
  // The bypass signs in with mock tokens, so it implies mock mode.
  authMode: authBypassRole ? 'mock' : parseAuthMode(process.env.EXPO_PUBLIC_AUTH_MODE),
  authBypassRole,
  sessionIdleMinutes: parseIdleMinutes(process.env.EXPO_PUBLIC_SESSION_IDLE_MINUTES),
  roleClaim: clean(process.env.EXPO_PUBLIC_ROLE_CLAIM) ?? DEFAULT_ROLE_CLAIM,
  officer: {
    issuer: clean(process.env.EXPO_PUBLIC_OFFICER_OIDC_ISSUER),
    clientId: clean(process.env.EXPO_PUBLIC_OFFICER_OIDC_CLIENT_ID),
    redirectScheme: clean(process.env.EXPO_PUBLIC_OFFICER_OIDC_REDIRECT_SCHEME),
  },
  contractor: {
    issuer: clean(process.env.EXPO_PUBLIC_CONTRACTOR_OIDC_ISSUER),
    clientId: clean(process.env.EXPO_PUBLIC_CONTRACTOR_OIDC_CLIENT_ID),
    redirectScheme: clean(process.env.EXPO_PUBLIC_CONTRACTOR_OIDC_REDIRECT_SCHEME),
  },
};

/**
 * Mock sign-in is possible only when explicitly requested AND running a development bundle.
 * `__DEV__` is statically false in production bundles, so this can never be true there.
 */
export function isMockAuthEnabled(mode: AuthMode = env.authMode): boolean {
  return __DEV__ && mode === 'mock';
}

/**
 * Development auth bypass (EXPO_PUBLIC_AUTH_BYPASS): every launch starts signed in as the configured
 * role, with no sign-in, unlock or idle sign-out, and the sign-in / unlock screens stay reachable.
 * Like mock mode, it can never be on in a production bundle.
 */
export function isAuthBypassEnabled(role: UserRole | undefined = env.authBypassRole): boolean {
  return __DEV__ && role !== undefined;
}

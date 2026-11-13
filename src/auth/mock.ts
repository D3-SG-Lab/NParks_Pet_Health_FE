/**
 * DEVELOPMENT-ONLY mock sign-in (identity providers are not set up yet: INF-007).
 * Only reachable when EXPO_PUBLIC_AUTH_MODE=mock AND __DEV__. This module refuses to run otherwise
 * and the caller additionally guards the require() so production bundles never include it.
 */
import { ApiError, isApiEnabled, unwrap } from '@/api';
import { postApiV1AuthDevToken, postApiV1AuthLogout, postApiV1AuthRefresh } from '@/api/generated';
import type { TokenResponseDto } from '@/api/generated';
import { isMockAuthEnabled } from '@/config/env';

import { decodeJwtPayload } from './claims';
import { AuthError, type AuthProviderId, type TokenSet } from './types';

/**
 * Backend user ids the development tokens are issued for (POST /auth/dev-token embeds them as `sub`).
 * TEMPORARY: replace with the seeded AQC staff ids once the backend has them.
 */
const DEV_TOKEN_USER_IDS: Record<AuthProviderId, number> = { officer: 1, contractor: 2 };

function encode(obj: object): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createMockTokens(provider: AuthProviderId): TokenSet {
  if (!isMockAuthEnabled()) {
    throw new Error('Mock authentication is disabled.');
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: `mock-${provider}`,
    name: provider === 'officer' ? 'Mock Officer' : 'Mock Contractor',
    email: `${provider}@mock.invalid`,
    role: provider,
    iat: now,
    exp: now + 3600,
  };
  // Unsigned, clearly fake tokens. The backend will reject them.
  const fake = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
  return {
    accessToken: fake,
    idToken: fake,
    refreshToken: `mock-refresh-${provider}`,
    expiresAt: (now + 3600) * 1000,
  };
}

/** True for a refresh token the backend issued (the mock ones are "mock-refresh-<role>"). */
function isBackendRefreshToken(token: string | undefined): token is string {
  return Boolean(token) && !token?.startsWith('mock-refresh-');
}

/**
 * The backend's tokens on top of the mock ones (whose ID token still supplies the display claims).
 * Expiry comes from the JWT `exp`, falling back to `expires_in`. When the backend issues no refresh token
 * (the live dev server returns ""), the mock one keeps the scheduled refresh running, and refreshing
 * asks for a new dev token.
 */
function withBackendTokens(tokens: TokenSet, issued: TokenResponseDto): TokenSet {
  const exp = decodeJwtPayload(issued.access_token)?.exp;
  const expiresAt = typeof exp === 'number' ? exp * 1000 : Date.now() + Number(issued.expires_in) * 1000;
  return { ...tokens, accessToken: issued.access_token, refreshToken: issued.refresh_token || tokens.refreshToken, expiresAt };
}

/**
 * Mock sign-in tokens. With EXPO_PUBLIC_API_URL set, the access (and refresh) token come from the backend's
 * development-only POST /auth/dev-token, so API calls are authorised. If the backend can't issue one, the
 * fake token is kept and API calls will be rejected.
 */
export async function createMockSessionTokens(provider: AuthProviderId): Promise<TokenSet> {
  const tokens = createMockTokens(provider);
  if (!isApiEnabled()) return tokens;
  try {
    const issued = await unwrap(
      postApiV1AuthDevToken({
        body: { userId: DEV_TOKEN_USER_IDS[provider], userType: 'aqc_staff', aqcStaffRole: provider },
      }),
    );
    return withBackendTokens(tokens, issued);
  } catch (error) {
    console.warn("Mock sign-in: couldn't get a development token from the API; API calls will be rejected.", error);
    return tokens;
  }
}

/**
 * Silent refresh of a mock session: POST /auth/refresh with the backend's refresh token when there is one;
 * when it is rejected (401) or there is none, a new dev token.
 */
export async function refreshMockSessionTokens(provider: AuthProviderId, current: TokenSet): Promise<TokenSet> {
  if (isApiEnabled() && isBackendRefreshToken(current.refreshToken)) {
    try {
      const issued = await unwrap(postApiV1AuthRefresh({ body: { refresh_token: current.refreshToken } }));
      return withBackendTokens(createMockTokens(provider), issued);
    } catch (error) {
      // Offline: AuthProvider keeps the session while the token is valid and retries later.
      if (error instanceof ApiError && error.status === 0) throw new AuthError('network', error.message);
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
  }
  return createMockSessionTokens(provider);
}

/** Sign-out of a mock session: revokes the backend's refresh token (POST /auth/logout). Best effort. */
export async function revokeMockSession(current: TokenSet): Promise<void> {
  if (!isApiEnabled() || !isBackendRefreshToken(current.refreshToken)) return;
  try {
    await unwrap(postApiV1AuthLogout({ body: { refresh_token: current.refreshToken } }));
  } catch (error) {
    console.warn("Sign-out: couldn't revoke the session on the API.", error);
  }
}

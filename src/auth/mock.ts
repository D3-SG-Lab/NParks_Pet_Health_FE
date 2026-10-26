/**
 * DEVELOPMENT-ONLY mock sign-in (identity providers are not set up yet: INF-007).
 * Only reachable when EXPO_PUBLIC_AUTH_MODE=mock AND __DEV__. This module refuses to run otherwise
 * and the caller additionally guards the require() so production bundles never include it.
 */
import { isMockAuthEnabled } from '@/config/env';

import type { AuthProviderId, TokenSet } from './types';

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

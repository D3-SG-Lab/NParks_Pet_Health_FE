import { env, isMockAuthEnabled, type ProviderEnv } from '@/config/env';

import type { AuthProviderId } from './types';

export interface ProviderConfig {
  issuer: string;
  clientId: string;
  redirectScheme: string;
}

export function getProviderEnv(provider: AuthProviderId): ProviderEnv {
  return provider === 'officer' ? env.officer : env.contractor;
}

/** Returns the full config, or null when any of issuer / client ID / redirect scheme is missing. */
export function getProviderConfig(provider: AuthProviderId): ProviderConfig | null {
  const { issuer, clientId, redirectScheme } = getProviderEnv(provider);
  if (!issuer || !clientId || !redirectScheme) return null;
  return { issuer, clientId, redirectScheme };
}

/** A provider can be used if its OIDC config is complete, or if development mock mode is on. */
export function isProviderAvailable(provider: AuthProviderId): boolean {
  return isMockAuthEnabled() || getProviderConfig(provider) !== null;
}

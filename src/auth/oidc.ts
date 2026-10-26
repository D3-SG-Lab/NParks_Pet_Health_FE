/**
 * OIDC Authorization Code + PKCE (S256) with expo-auth-session. MFA is enforced by the identity
 * provider; the app only ever sees the resulting tokens.
 *
 * Note: expo-auth-session does not verify ID token signatures. The role read from claims is for UI
 * visibility only; the backend must validate tokens and enforce roles on every request.
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { getProviderConfig, type ProviderConfig } from './providers';
import { AuthError, type AuthProviderId, type TokenSet } from './types';

// Required on web so the popup/redirect window can hand the result back and close itself.
WebBrowser.maybeCompleteAuthSession();

const SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

const discoveryCache = new Map<string, AuthSession.DiscoveryDocument>();

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const message = messageOf(error);
  if (/network|failed to fetch|timed out|timeout|offline|internet/i.test(message)) {
    return new AuthError('network', message);
  }
  return new AuthError('provider', message);
}

function requireConfig(provider: AuthProviderId): ProviderConfig {
  const config = getProviderConfig(provider);
  if (!config) throw new AuthError('not_configured');
  return config;
}

async function discover(issuer: string): Promise<AuthSession.DiscoveryDocument> {
  const cached = discoveryCache.get(issuer);
  if (cached) return cached;
  try {
    const doc = await AuthSession.fetchDiscoveryAsync(issuer);
    discoveryCache.set(issuer, doc);
    return doc;
  } catch (error) {
    throw toAuthError(error);
  }
}

function redirectUriFor(config: ProviderConfig): string {
  return AuthSession.makeRedirectUri({ scheme: config.redirectScheme, path: 'auth/callback' });
}

function toTokenSet(response: AuthSession.TokenResponse, previous?: TokenSet): TokenSet {
  const issuedAt = response.issuedAt || Math.floor(Date.now() / 1000);
  return {
    accessToken: response.accessToken,
    idToken: response.idToken ?? previous?.idToken,
    refreshToken: response.refreshToken ?? previous?.refreshToken,
    expiresAt: (issuedAt + (response.expiresIn ?? DEFAULT_EXPIRES_IN_SECONDS)) * 1000,
  };
}

export async function signInWithProvider(provider: AuthProviderId): Promise<TokenSet> {
  const config = requireConfig(provider);
  const discovery = await discover(config.issuer);
  const redirectUri = redirectUriFor(config);

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    scopes: SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  let result: AuthSession.AuthSessionResult;
  try {
    result = await request.promptAsync(discovery);
  } catch (error) {
    throw toAuthError(error);
  }

  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    throw new AuthError('cancelled');
  }
  if (result.type !== 'success') {
    throw new AuthError('provider', result.type === 'error' ? result.error?.message : undefined);
  }

  const code = result.params.code;
  if (!code || !request.codeVerifier) throw new AuthError('provider', 'Missing authorization code');

  try {
    const response = await AuthSession.exchangeCodeAsync(
      {
        clientId: config.clientId,
        code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      discovery,
    );
    return toTokenSet(response);
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Silent refresh with the refresh token. Throws AuthError('network') when it can be retried later. */
export async function refreshWithProvider(provider: AuthProviderId, previous: TokenSet): Promise<TokenSet> {
  const config = requireConfig(provider);
  if (!previous.refreshToken) throw new AuthError('provider', 'No refresh token');
  const discovery = await discover(config.issuer);
  try {
    const response = await AuthSession.refreshAsync(
      { clientId: config.clientId, refreshToken: previous.refreshToken },
      discovery,
    );
    return toTokenSet(response, previous);
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Best-effort revocation of the refresh token on logout. Never throws. */
export async function revokeWithProvider(provider: AuthProviderId, refreshToken: string | undefined): Promise<void> {
  const config = getProviderConfig(provider);
  if (!config || !refreshToken) return;
  try {
    const discovery = await discover(config.issuer);
    if (!discovery.revocationEndpoint) return;
    await AuthSession.revokeAsync(
      { clientId: config.clientId, token: refreshToken, tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken },
      discovery,
    );
  } catch {
    // Local sign-out has already happened; revocation is best effort.
  }
}

/**
 * API layer, prepared for a client generated from the backend OpenAPI spec (BE-001).
 *
 * OUTSTANDING: docs/api/openapi.yaml does not exist yet. Once it does, run `npm run api:generate`
 * (see openapi-ts.config.ts); output goes to src/api/generated/. Then wire the generated client here:
 *
 *   import { client } from './generated/client.gen';
 *   client.setConfig({ baseUrl: apiConfig.baseUrl, auth: () => getApiAuthToken() });
 *
 * and use the generated TanStack Query helpers in screens. Do not hand-write fetch calls.
 * No endpoint is needed by the sign-in feature itself (the app talks to the OIDC providers directly).
 */
import { env } from '@/config/env';

export const apiConfig = {
  /** Backend base URL from EXPO_PUBLIC_API_URL. Undefined means the API is not configured. */
  baseUrl: env.apiUrl,
} as const;

type AccessTokenGetter = () => Promise<string | null>;

let accessTokenGetter: AccessTokenGetter = async () => null;

/** Called by AuthProvider so the API client can attach a fresh (silently refreshed) bearer token. */
export function configureApiAuth(getter: AccessTokenGetter): void {
  accessTokenGetter = getter;
}

export function getApiAuthToken(): Promise<string | null> {
  return accessTokenGetter();
}

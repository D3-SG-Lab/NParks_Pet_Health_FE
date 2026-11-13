/**
 * API layer over the client generated from the backend OpenAPI spec (`npm run api:generate`, output in
 * src/api/generated/). Feature `*Api.ts` modules call the generated SDK functions and map the results to
 * the domain types; screens never call the API directly.
 *
 * The backend is only partly built, so each feature module checks `isApiEnabled()` and keeps its mock
 * implementation for everything the API does not cover yet. With EXPO_PUBLIC_API_URL empty the whole app
 * runs on the in-memory demo data, as before.
 */
import { Platform } from 'react-native';

import { env } from '@/config/env';

import { client } from './generated/client.gen';

/**
 * On web in development the app calls its own origin and the dev server proxies /api/ to the backend
 * (metro.config.js): the backend sends no CORS headers, so the browser would block direct calls.
 */
function resolveBaseUrl(): string | undefined {
  if (!env.apiUrl) return undefined;
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return env.apiUrl.replace(/\/+$/, '');
}

export const apiConfig = {
  /** Backend base URL from EXPO_PUBLIC_API_URL. Undefined means the API is not configured. */
  baseUrl: resolveBaseUrl(),
} as const;

/** True when EXPO_PUBLIC_API_URL is set: the integrated endpoints call the backend instead of the mock. */
export function isApiEnabled(): boolean {
  return apiConfig.baseUrl !== undefined;
}

type AccessTokenGetter = () => Promise<string | null>;

let accessTokenGetter: AccessTokenGetter = async () => null;

/** Called by AuthProvider so the API client can attach a fresh (silently refreshed) bearer token. */
export function configureApiAuth(getter: AccessTokenGetter): void {
  accessTokenGetter = getter;
}

export function getApiAuthToken(): Promise<string | null> {
  return accessTokenGetter();
}

if (apiConfig.baseUrl) client.setConfig({ baseUrl: apiConfig.baseUrl });

// The spec declares no security schemes, so the bearer token is attached here for every call.
client.interceptors.request.use(async (request) => {
  const token = await accessTokenGetter();
  if (token && !request.headers.has('Authorization')) request.headers.set('Authorization', `Bearer ${token}`);
  return request;
});

export { ApiError, rejectionMessage, unwrap } from './errors';

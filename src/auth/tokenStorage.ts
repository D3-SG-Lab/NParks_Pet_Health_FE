/**
 * Native token storage (iOS Keychain / Android Keystore via expo-secure-store).
 * Tokens are NEVER written to AsyncStorage. The web build uses tokenStorage.web.ts (memory only).
 */
import * as SecureStore from 'expo-secure-store';

import type { AuthProviderId, StoredSession } from './types';

const KEY_ACCESS = 'aqc.auth.access';
const KEY_ID = 'aqc.auth.id';
const KEY_REFRESH = 'aqc.auth.refresh';
const KEY_META = 'aqc.auth.meta';
const KEY_LAST_ACTIVE = 'aqc.auth.lastActive';
const KEY_BIOMETRIC = 'aqc.pref.biometric';

interface Meta {
  provider: AuthProviderId;
  mock: boolean;
  expiresAt: number;
}

function isMeta(value: unknown): value is Meta {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.provider === 'officer' || v.provider === 'contractor') &&
    typeof v.mock === 'boolean' &&
    typeof v.expiresAt === 'number'
  );
}

export async function loadSession(): Promise<StoredSession | null> {
  const [access, id, refresh, metaRaw] = await Promise.all([
    SecureStore.getItemAsync(KEY_ACCESS),
    SecureStore.getItemAsync(KEY_ID),
    SecureStore.getItemAsync(KEY_REFRESH),
    SecureStore.getItemAsync(KEY_META),
  ]);
  if (!access || !metaRaw) return null;
  try {
    const meta: unknown = JSON.parse(metaRaw);
    if (!isMeta(meta)) return null;
    return {
      accessToken: access,
      idToken: id ?? undefined,
      refreshToken: refresh ?? undefined,
      provider: meta.provider,
      mock: meta.mock,
      expiresAt: meta.expiresAt,
    };
  } catch {
    return null;
  }
}

async function setOrDelete(key: string, value: string | undefined): Promise<void> {
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export async function saveSession(session: StoredSession): Promise<void> {
  const meta: Meta = { provider: session.provider, mock: session.mock, expiresAt: session.expiresAt };
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, session.accessToken),
    setOrDelete(KEY_ID, session.idToken),
    setOrDelete(KEY_REFRESH, session.refreshToken),
    SecureStore.setItemAsync(KEY_META, JSON.stringify(meta)),
  ]);
}

/** Removes tokens and stored user data. The biometric preference is a device setting and is kept. */
export async function clearSession(): Promise<void> {
  await Promise.all(
    [KEY_ACCESS, KEY_ID, KEY_REFRESH, KEY_META, KEY_LAST_ACTIVE].map((key) => SecureStore.deleteItemAsync(key)),
  );
}

export async function loadLastActive(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(KEY_LAST_ACTIVE);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function saveLastActive(timestamp: number): Promise<void> {
  await SecureStore.setItemAsync(KEY_LAST_ACTIVE, String(timestamp));
}

export async function loadBiometricPreference(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY_BIOMETRIC)) === '1';
}

export async function saveBiometricPreference(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(KEY_BIOMETRIC, '1');
  else await SecureStore.deleteItemAsync(KEY_BIOMETRIC);
}

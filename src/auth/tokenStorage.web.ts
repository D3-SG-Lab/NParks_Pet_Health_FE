/**
 * Web token storage: MEMORY ONLY.
 *
 * Browsers have no equivalent of the Keychain/Keystore. localStorage/sessionStorage are readable by
 * any script on the page (XSS), so tokens are kept in a module variable and disappear on reload or
 * tab close; the user then signs in again (the identity provider's own SSO cookie usually makes
 * that one click). The preferred long-term pattern is a backend-for-frontend that keeps the refresh
 * token in an httpOnly, Secure, SameSite cookie. That needs backend support and is listed as
 * outstanding. Biometric unlock is not offered on web, so no preference is stored.
 */
import type { StoredSession } from './types';

let memorySession: StoredSession | null = null;

export async function loadSession(): Promise<StoredSession | null> {
  return memorySession;
}

export async function saveSession(session: StoredSession): Promise<void> {
  memorySession = session;
}

export async function clearSession(): Promise<void> {
  memorySession = null;
}

export async function loadLastActive(): Promise<number | null> {
  return null;
}

export async function saveLastActive(_timestamp: number): Promise<void> {}

export async function loadBiometricPreference(): Promise<boolean> {
  return false;
}

export async function saveBiometricPreference(_enabled: boolean): Promise<void> {}

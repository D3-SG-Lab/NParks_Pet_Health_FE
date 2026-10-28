import { Platform } from 'react-native';

import { env } from '@/config/env';

import type { UserRole } from './types';

const STORAGE_KEY = 'aqc.authBypassRole';

/** Role picked on the sign-in screen while the development auth bypass is on (this app run only). */
let chosenRole: UserRole | null = null;

function webStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Role the development auth bypass signs in as: the one last picked on the sign-in screen, else
 * EXPO_PUBLIC_AUTH_BYPASS. On web the pick is kept in sessionStorage (the role name only, never a
 * token) so a reload or a typed URL keeps it; on native a fresh launch starts from the env role again.
 */
export function bypassRole(): UserRole | undefined {
  if (chosenRole) return chosenRole;
  try {
    const stored = webStorage()?.getItem(STORAGE_KEY);
    if (stored === 'officer' || stored === 'contractor') return stored;
  } catch {
    // Storage blocked: fall back to the env role.
  }
  return env.authBypassRole;
}

/** Remembers the role picked on the sign-in screen; null forgets it (sign-out). */
export function setBypassRole(role: UserRole | null): void {
  chosenRole = role;
  try {
    const storage = webStorage();
    if (role) storage?.setItem(STORAGE_KEY, role);
    else storage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the in-memory pick still applies until the next reload.
  }
}

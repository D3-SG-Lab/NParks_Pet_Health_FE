import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, View } from 'react-native';

import { configureApiAuth } from '@/api';
import { env, isAuthBypassEnabled, isMockAuthEnabled } from '@/config/env';

import { authenticateWithBiometrics, isBiometricSupported } from './biometrics';
import { bypassRole, setBypassRole } from './bypassRole';
import { buildSession } from './claims';
import { refreshWithProvider, revokeWithProvider, signInWithProvider, toAuthError } from './oidc';
import * as storage from './tokenStorage';
import {
  AuthError,
  type AuthProviderId,
  type AuthStatus,
  type Session,
  type SignOutNotice,
  type StoredSession,
  type TokenSet,
  type UserRole,
} from './types';

const IDLE_CHECK_INTERVAL_MS = 15_000;
const REFRESH_LEEWAY_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;
const NETWORK_RETRY_MS = 30_000;
const LAST_ACTIVE_PERSIST_MS = 60_000;

export interface SessionContextValue {
  status: AuthStatus;
  session: Session | null;
  role: UserRole | null;
  isOfficer: boolean;
  isContractor: boolean;
  /** Why the user was last signed out automatically (idle, expired...), if they were. */
  notice: SignOutNotice | null;
  biometricEnabled: boolean;
  biometricSupported: boolean;
  /** Resolves null on success, or the AuthError to show. */
  signIn: (provider: AuthProviderId) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  /** Resolves false when biometrics are not available on this device. */
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  /** Current access token, silently refreshed when close to expiry. */
  getAccessToken: () => Promise<string | null>;
  dismissNotice: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

function mockTokens(provider: AuthProviderId): TokenSet {
  // Double guard: the require() sits behind __DEV__ so production bundles drop the mock module.
  if (__DEV__ && isMockAuthEnabled()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mock: typeof import('./mock') = require('./mock');
    return mock.createMockTokens(provider);
  }
  throw new AuthError('not_configured');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<SignOutNotice | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  const storedRef = useRef<StoredSession | null>(null);
  // Set to "now" whenever a session starts or is restored, before the status becomes active.
  const lastActiveRef = useRef(0);
  const lastPersistedRef = useRef(0);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);
  const statusRef = useRef<AuthStatus>('loading');

  const idleMs = env.sessionIdleMinutes * 60_000;

  const updateStatus = useCallback((next: AuthStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  /** Clears tokens, stored user data and the query cache, then returns to signed-out. */
  const endSession = useCallback(
    async (reason: SignOutNotice | null) => {
      storedRef.current = null;
      setSession(null);
      setNotice(reason);
      updateStatus('signedOut');
      queryClient.clear();
      try {
        await storage.clearSession();
      } catch {
        // Nothing more we can do; in-memory state is already cleared.
      }
    },
    [queryClient, updateStatus],
  );

  const applyTokens = useCallback(
    async (provider: AuthProviderId, tokens: TokenSet, mock: boolean): Promise<Session> => {
      const stored: StoredSession = { ...tokens, provider, mock };
      const built = buildSession(stored, env.roleClaim);
      if (!built) throw new AuthError('no_role');
      if (built.role !== provider) throw new AuthError('role_mismatch');
      await storage.saveSession(stored);
      storedRef.current = stored;
      setSession(built);
      return built;
    },
    [],
  );

  /** Silent refresh. Resolves true if the session is still usable afterwards. */
  const refreshNow = useCallback((): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const current = storedRef.current;
    if (!current) return Promise.resolve(false);

    const run = async (): Promise<boolean> => {
      try {
        if (!current.refreshToken) throw new AuthError('provider', 'No refresh token');
        const next = current.mock ? mockTokens(current.provider) : await refreshWithProvider(current.provider, current);
        await applyTokens(current.provider, next, current.mock);
        return true;
      } catch (error) {
        const authError = toAuthError(error);
        if (authError.kind === 'network' && current.expiresAt > Date.now()) {
          return true; // still valid; the scheduler retries later
        }
        if (authError.kind === 'network') return false; // expired and offline: caller decides
        await endSession('expired');
        return false;
      }
    };
    const promise = run().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = promise;
    return promise;
  }, [applyTokens, endSession]);

  // --- Restore on cold start -------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pref, supported] = await Promise.all([storage.loadBiometricPreference(), isBiometricSupported()]);
      if (cancelled) return;
      setBiometricEnabledState(pref);
      setBiometricSupported(supported);

      // Development auth bypass: start signed in as the configured role (or the one last picked on the
      // sign-in screen), skipping sign-in and unlock.
      const role = isAuthBypassEnabled() ? bypassRole() : undefined;
      if (role) {
        try {
          await applyTokens(role, mockTokens(role), true);
          if (cancelled) return;
          lastActiveRef.current = Date.now();
          return updateStatus('signedIn');
        } catch {
          // Fall through to the normal restore.
        }
      }

      let stored: StoredSession | null = null;
      try {
        stored = await storage.loadSession();
      } catch {
        stored = null;
      }
      if (cancelled) return;
      if (!stored) return updateStatus('signedOut');

      // A mock session must never survive into a build where mock mode is off.
      if (stored.mock && !isMockAuthEnabled()) return endSession(null);

      const lastActive = await storage.loadLastActive();
      if (cancelled) return;
      if (lastActive !== null && Date.now() - lastActive > idleMs) return endSession('idle');

      const built = buildSession(stored, env.roleClaim);
      if (!built) return endSession(null);

      storedRef.current = stored;
      setSession(built);
      lastActiveRef.current = Date.now();

      if (stored.expiresAt <= Date.now()) {
        const ok = await refreshNow();
        if (cancelled) return;
        if (!ok) return statusRef.current === 'signedOut' ? undefined : endSession('expired');
      }
      if (pref && !supported) return endSession('biometric_unavailable');
      updateStatus(pref && supported ? 'locked' : 'signedIn');
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Scheduled silent refresh ------------------------------------------------------------------
  const expiresAt = session?.expiresAt ?? null;
  useEffect(() => {
    if (expiresAt === null) return;
    const hasRefresh = Boolean(storedRef.current?.refreshToken);
    let timer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => {
      timer = setTimeout(async () => {
        if (!hasRefresh) return void endSession('expired');
        const ok = await refreshNow();
        if (!ok && storedRef.current) schedule(NETWORK_RETRY_MS);
      }, delay);
    };

    if (hasRefresh) {
      schedule(Math.max(expiresAt - Date.now() - REFRESH_LEEWAY_MS, MIN_REFRESH_DELAY_MS));
    } else {
      schedule(Math.max(expiresAt - Date.now(), 0));
    }
    return () => clearTimeout(timer);
  }, [expiresAt, refreshNow, endSession]);

  // --- Idle timeout ------------------------------------------------------------------------------
  const noteActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    if (statusRef.current === 'signedIn' && now - lastPersistedRef.current > LAST_ACTIVE_PERSIST_MS) {
      lastPersistedRef.current = now;
      void storage.saveLastActive(now).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (status !== 'signedIn' && status !== 'locked') return;
    if (isAuthBypassEnabled()) return; // no idle sign-out while the development bypass is on
    const check = () => {
      if (Date.now() - lastActiveRef.current > idleMs) void endSession('idle');
    };
    const interval = setInterval(check, IDLE_CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        check();
      } else {
        void storage.saveLastActive(lastActiveRef.current).catch(() => undefined);
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [status, idleMs, endSession]);

  // Web: keyboard and pointer activity also count as activity.
  useEffect(() => {
    if (Platform.OS !== 'web' || status !== 'signedIn') return;
    const events = ['keydown', 'pointerdown', 'scroll'] as const;
    events.forEach((e) => document.addEventListener(e, noteActivity, { passive: true, capture: true }));
    return () => events.forEach((e) => document.removeEventListener(e, noteActivity, { capture: true }));
  }, [status, noteActivity]);

  // --- Public actions ----------------------------------------------------------------------------
  const signIn = useCallback(
    async (provider: AuthProviderId): Promise<AuthError | null> => {
      try {
        const mock = isMockAuthEnabled();
        const tokens = mock ? mockTokens(provider) : await signInWithProvider(provider);
        try {
          await applyTokens(provider, tokens, mock);
        } catch (error) {
          if (!mock) void revokeWithProvider(provider, tokens.refreshToken);
          throw error;
        }
        lastActiveRef.current = Date.now();
        setNotice(null);
        if (isAuthBypassEnabled()) setBypassRole(provider);
        updateStatus('signedIn');
        return null;
      } catch (error) {
        return toAuthError(error);
      }
    },
    [applyTokens, updateStatus],
  );

  const signOut = useCallback(async () => {
    const current = storedRef.current;
    if (isAuthBypassEnabled()) setBypassRole(null);
    await endSession(null);
    if (current && !current.mock) void revokeWithProvider(current.provider, current.refreshToken);
  }, [endSession]);

  const unlock = useCallback(async () => {
    const ok = await authenticateWithBiometrics('Unlock AQC Animal Health');
    if (ok) {
      lastActiveRef.current = Date.now();
      updateStatus('signedIn');
    }
    return ok;
  }, [updateStatus]);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !(await isBiometricSupported())) {
      setBiometricSupported(false);
      return false;
    }
    setBiometricSupported(await isBiometricSupported());
    await storage.saveBiometricPreference(enabled);
    setBiometricEnabledState(enabled);
    return true;
  }, []);

  const getAccessToken = useCallback(async () => {
    const current = storedRef.current;
    if (!current) return null;
    if (current.expiresAt - Date.now() < REFRESH_LEEWAY_MS / 2) await refreshNow();
    return storedRef.current?.accessToken ?? null;
  }, [refreshNow]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    configureApiAuth(getAccessToken);
  }, [getAccessToken]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      role: session?.role ?? null,
      isOfficer: session?.role === 'officer',
      isContractor: session?.role === 'contractor',
      notice,
      biometricEnabled,
      biometricSupported,
      signIn,
      signOut,
      unlock,
      setBiometricEnabled,
      getAccessToken,
      dismissNotice,
    }),
    [
      status,
      session,
      notice,
      biometricEnabled,
      biometricSupported,
      signIn,
      signOut,
      unlock,
      setBiometricEnabled,
      getAccessToken,
      dismissNotice,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {/* Observes touches (without consuming them) to reset the idle timer. */}
      <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => (noteActivity(), false)}>
        {children}
      </View>
    </SessionContext.Provider>
  );
}

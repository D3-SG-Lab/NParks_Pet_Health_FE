export type UserRole = 'officer' | 'contractor';

/** Which identity provider issued the tokens. Officer and contractor each have their own. */
export type AuthProviderId = UserRole;

export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

export interface TokenSet {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  /** Access token expiry, epoch milliseconds. */
  expiresAt: number;
}

/** What is persisted (secure storage on native, memory only on web). */
export interface StoredSession extends TokenSet {
  provider: AuthProviderId;
  /** True for development mock sessions. Rejected on restore unless mock mode is enabled. */
  mock: boolean;
}

/** Non-secret view of the signed-in user exposed to the UI. */
export interface Session {
  role: UserRole;
  provider: AuthProviderId;
  userId: string | null;
  name: string | null;
  email: string | null;
  expiresAt: number;
  mock: boolean;
}

export type AuthErrorKind =
  | 'cancelled'
  | 'network'
  | 'provider'
  | 'not_configured'
  | 'no_role'
  | 'role_mismatch'
  | 'biometric_unavailable';

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'AuthError';
    this.kind = kind;
  }
}

export type SignOutNotice = 'idle' | 'expired' | 'biometric_unavailable';

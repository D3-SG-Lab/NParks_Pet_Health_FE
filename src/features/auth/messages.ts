import type { AuthErrorKind, AuthProviderId, SignOutNotice } from '@/auth';

export function errorMessage(kind: AuthErrorKind, provider: AuthProviderId): { title: string; message: string } {
  switch (kind) {
    case 'cancelled':
      return { title: 'Sign-in cancelled', message: 'You cancelled sign-in. Choose an option to try again.' };
    case 'network':
      return {
        title: 'Network error',
        message: 'We could not reach the sign-in service. Check your connection and try again.',
      };
    case 'provider':
      return {
        title: 'Identity provider error',
        message: 'The identity provider reported a problem. Try again, or contact support if it continues.',
      };
    case 'not_configured':
      return {
        title: 'Sign-in not configured',
        message: 'Sign-in for this account type is not set up in this build yet.',
      };
    case 'no_role':
      return {
        title: 'No role assigned',
        message: 'Your account has no AQC role. Contact your administrator.',
      };
    case 'role_mismatch':
      return {
        title: 'Wrong account type',
        message:
          provider === 'officer'
            ? 'This account is not an AVS / NParks officer account. Try the Contractor option.'
            : 'This account is not a contractor account. Try the AVS / NParks officer option.',
      };
    case 'biometric_unavailable':
      return {
        title: 'Biometrics unavailable',
        message: 'Biometrics are not set up on this device.',
      };
  }
}

export function noticeMessage(notice: SignOutNotice): string {
  switch (notice) {
    case 'idle':
      return 'You were signed out because of inactivity. Sign in again to continue.';
    case 'expired':
      return 'Your session expired. Sign in again to continue.';
    case 'biometric_unavailable':
      return 'Biometric unlock is no longer available on this device, so you were signed out.';
  }
}

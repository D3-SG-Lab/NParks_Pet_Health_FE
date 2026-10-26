import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useSession } from '@/auth';
import { AppText, Button } from '@/components';
import { env } from '@/config/env';
import { SignInScreen } from '@/features/auth/SignInScreen';

jest.mock('@/auth/tokenStorage', () => ({
  loadSession: jest.fn(async () => null),
  saveSession: jest.fn(async () => undefined),
  clearSession: jest.fn(async () => undefined),
  loadLastActive: jest.fn(async () => null),
  saveLastActive: jest.fn(async () => undefined),
  loadBiometricPreference: jest.fn(async () => false),
  saveBiometricPreference: jest.fn(async () => undefined),
}));
jest.mock('@/auth/biometrics', () => ({
  isBiometricSupported: jest.fn(async () => false),
  authenticateWithBiometrics: jest.fn(async () => false),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const storage = require('@/auth/tokenStorage') as {
  saveSession: jest.Mock;
  clearSession: jest.Mock;
  loadBiometricPreference: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const biometrics = require('@/auth/biometrics') as { isBiometricSupported: jest.Mock };

function Probe() {
  const { status, role } = useSession();
  return <AppText testID="probe">{`${status}:${role ?? 'none'}`}</AppText>;
}

function wrap(children: ReactNode, client = new QueryClient()) {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
        {children}
      </AuthProvider>
    </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('sign-in and session (mock mode, development)', () => {
  beforeAll(() => {
    env.authMode = 'mock';
  });
  beforeEach(() => jest.clearAllMocks());

  it('FE-003: shows title, the two sign-in choices and the MFA note', async () => {
    wrap(<SignInScreen />);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedOut:none'));
    expect(screen.getByText('AQC Animal Health')).toBeTruthy();
    expect(screen.getByText('CHOOSE HOW YOU SIGN IN')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^AVS Officer/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Contractor/ })).toBeTruthy();
    expect(screen.getByText(/Multi-factor authentication is required/)).toBeTruthy();
    expect(screen.getByTestId('signin-mock')).toBeTruthy();
  });

  it('FE-003/FE-004: officer and contractor can sign in and the role is exposed', async () => {
    wrap(<SignInScreen />);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedOut:none'));
    fireEvent.press(screen.getByRole('button', { name: /^AVS Officer/ }));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedIn:officer'));
    expect(storage.saveSession).toHaveBeenCalledTimes(1);
  });

  it('FE-003: contractor sign-in yields the contractor role', async () => {
    wrap(<SignInScreen />);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedOut:none'));
    fireEvent.press(screen.getByRole('button', { name: /^Contractor/ }));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedIn:contractor'));
  });

  it('FE-003: sign out clears stored tokens and the query cache', async () => {
    const client = new QueryClient();
    client.setQueryData(['pets'], [{ id: 1 }]);
    wrap(
      <>
        <SignInScreen />
        <SignOutButton />
      </>,
      client,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedOut:none'));
    fireEvent.press(screen.getByRole('button', { name: /^Contractor/ }));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedIn:contractor'));

    fireEvent.press(screen.getByTestId('operations-signout'));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedOut:none'));
    expect(storage.clearSession).toHaveBeenCalled();
    expect(client.getQueryData(['pets'])).toBeUndefined();
  });
});

describe('development auth bypass', () => {
  beforeAll(() => {
    env.authMode = 'mock';
  });
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    env.authBypassRole = undefined;
  });

  it('starts signed in as the configured role without a sign-in', async () => {
    env.authBypassRole = 'officer';
    wrap(null);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedIn:officer'));
  });

  it('skips the biometric unlock', async () => {
    env.authBypassRole = 'contractor';
    storage.loadBiometricPreference.mockResolvedValueOnce(true);
    biometrics.isBiometricSupported.mockResolvedValueOnce(true);
    wrap(null);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedIn:contractor'));
  });
});

/** Signs out the way the account sheet does. */
function SignOutButton() {
  const { signOut } = useSession();
  return <Button label="Sign out" onPress={() => void signOut()} testID="operations-signout" />;
}

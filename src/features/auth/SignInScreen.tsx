import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useSession, type AuthErrorKind, type AuthProviderId } from '@/auth';
import { isProviderAvailable } from '@/auth/providers';
import { AppText, Banner, Button, Card, FadeIn, Icon, Screen, ToggleRow } from '@/components';
import { isMockAuthEnabled } from '@/config/env';
import { theme } from '@/theme';

import { errorMessage, noticeMessage } from './messages';

interface FailureState {
  kind: AuthErrorKind;
  provider: AuthProviderId;
}

export function SignInScreen() {
  const { signIn, notice, dismissNotice, biometricEnabled, setBiometricEnabled } = useSession();
  const [pending, setPending] = useState<AuthProviderId | null>(null);
  const inFlight = useRef(false);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);

  const officerAvailable = isProviderAvailable('officer');
  const contractorAvailable = isProviderAvailable('contractor');
  const anyMissing = !officerAvailable || !contractorAvailable;
  const mock = isMockAuthEnabled();

  const handleSignIn = async (provider: AuthProviderId) => {
    // Synchronous guard: state updates are async, so a fast double tap could otherwise start two flows.
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    dismissNotice();
    setPending(provider);
    const error = await signIn(provider);
    inFlight.current = false;
    setPending(null);
    if (error) setFailure({ kind: error.kind, provider });
    // On success the navigator moves to the tabs automatically (route guard).
  };

  const handleBiometric = async (next: boolean) => {
    setBiometricMessage(null);
    const ok = await setBiometricEnabled(next);
    if (!ok) setBiometricMessage(errorMessage('biometric_unavailable', 'officer').message);
  };

  const busy = pending !== null;
  const failureText = failure ? errorMessage(failure.kind, failure.provider) : null;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        {/* Logo placeholder: replace with the brand asset when DES delivers it. */}
        <View
          style={styles.logo}
          accessible
          accessibilityRole="image"
          accessibilityLabel="AQC Animal Health logo"
        >
          <Icon name="paw" size="lg" color={theme.colors.primary} />
        </View>
        <AppText variant="title" center accessibilityRole="header">
          AQC Animal Health
        </AppText>
        <AppText tone="muted" center>
          Quarantine animal health records
        </AppText>
      </View>

      <View style={styles.banners}>
        {notice ? <Banner kind="info" message={noticeMessage(notice)} testID="signin-notice" /> : null}
        {failureText ? (
          <Banner kind="error" title={failureText.title} message={failureText.message} testID="signin-error" />
        ) : null}
        {mock ? (
          <Banner
            kind="warning"
            title="Development mock sign-in"
            message="No identity provider is contacted. This mode exists only in development builds."
            testID="signin-mock"
          />
        ) : null}
        {anyMissing && !mock ? (
          <Banner
            kind="warning"
            title="Sign-in not configured"
            message="One or more identity providers are not configured in this build. Contact your administrator."
            testID="signin-missing-config"
          />
        ) : null}
      </View>

      <FadeIn>
      <Card style={styles.actions}>
        <AppText bold accessibilityRole="header">
          Sign in as
        </AppText>
        <Button
          label="AVS / NParks officer"
          icon="shield-checkmark-outline"
          variant="primary"
          testID="signin-officer"
          loading={pending === 'officer'}
          disabled={busy || !officerAvailable}
          onPress={() => void handleSignIn('officer')}
        />
        <Button
          label="Contractor"
          icon="briefcase-outline"
          variant="secondary"
          testID="signin-contractor"
          loading={pending === 'contractor'}
          disabled={busy || !contractorAvailable}
          onPress={() => void handleSignIn('contractor')}
        />
        <View style={styles.mfa}>
          <Icon name="lock-closed-outline" size="sm" color={theme.colors.textMuted} />
          <AppText variant="caption" tone="muted" style={styles.mfaText}>
            Multi-factor authentication is required.
          </AppText>
        </View>
      </Card>
      </FadeIn>

      {Platform.OS !== 'web' ? (
        <Card>
          <ToggleRow
            testID="signin-biometric"
            label="Unlock with biometrics on reopen"
            value={biometricEnabled}
            disabled={busy}
            onValueChange={(next) => void handleBiometric(next)}
          />
          {biometricMessage ? (
            <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {biometricMessage}
            </AppText>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: theme.control.logo,
    height: theme.control.logo,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  banners: { gap: theme.spacing.md },
  actions: { gap: theme.spacing.md, padding: theme.spacing.xl },
  mfa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  mfaText: { flexShrink: 1 },
});

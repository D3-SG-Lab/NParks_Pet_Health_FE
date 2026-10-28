import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { useSession, type AuthErrorKind, type AuthProviderId } from '@/auth';
import { isProviderAvailable } from '@/auth/providers';
import { AppText, Banner, BottomSheet, Button, Icon, SectionLabel, type IconName, Pressable } from '@/components';
import { isAuthBypassEnabled, isMockAuthEnabled } from '@/config/env';
import { focusRing, shadow, theme } from '@/theme';

import { AuthLayout } from './AuthLayout';
import { errorMessage, noticeMessage } from './messages';

interface FailureState {
  kind: AuthErrorKind;
  provider: AuthProviderId;
}

const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

/** Screen 1: Login (FE-003). Two identity providers; MFA happens on the organisation's page. */
export function SignInScreen() {
  const { signIn, notice, dismissNotice, biometricEnabled, setBiometricEnabled } = useSession();
  const [pending, setPending] = useState<AuthProviderId | null>(null);
  const inFlight = useRef(false);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
    // On success the navigator moves to the tabs automatically (route guard), except under the development
    // auth bypass, which keeps this screen reachable, so go there explicitly.
    else if (isAuthBypassEnabled()) router.replace('/');
  };

  const handleBiometric = async (next: boolean) => {
    setBiometricMessage(null);
    const ok = await setBiometricEnabled(next);
    if (!ok) setBiometricMessage(errorMessage('biometric_unavailable', 'officer').message);
  };

  const busy = pending !== null;
  const failureText = failure ? errorMessage(failure.kind, failure.provider) : null;

  return (
    <AuthLayout title="AQC Animal Health" subtitle="Animal Quarantine Centre · NParks / AVS">
      {notice || failureText || mock || anyMissing ? (
        <View style={styles.banners}>
          {notice ? <Banner kind="info" message={noticeMessage(notice)} testID="signin-notice" /> : null}
          {failureText ? <Banner kind="error" title={failureText.title} message={failureText.message} testID="signin-error" /> : null}
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
      ) : null}

      <View style={styles.options}>
        <SectionLabel>Choose how you sign in</SectionLabel>
        <SignInOption
          testID="signin-officer"
          title="AVS Officer"
          subtitle="Sign in with government account"
          icon="shield-outline"
          primary
          loading={pending === 'officer'}
          disabled={busy || !officerAvailable}
          onPress={() => void handleSignIn('officer')}
        />
        <SignInOption
          testID="signin-contractor"
          title="Contractor"
          subtitle="Sign in with contractor account"
          icon="person-outline"
          loading={pending === 'contractor'}
          disabled={busy || !contractorAvailable}
          onPress={() => void handleSignIn('contractor')}
        />
        <View style={styles.mfa}>
          <Icon name="shield-checkmark-outline" size="sm" color={theme.colors.primary} />
          <AppText variant="bodyS" tone="muted" style={styles.flex}>
            You’ll be redirected to your organisation’s sign-in page. Multi-factor authentication is required.
          </AppText>
        </View>
      </View>

      <View style={styles.bottom}>
        {Platform.OS !== 'web' ? (
          <Button
            testID="signin-biometric"
            variant="tonal"
            icon={biometricEnabled ? 'checkmark-circle-outline' : 'scan-outline'}
            label={biometricEnabled ? 'Face ID / fingerprint unlock is on' : 'Unlock with Face ID / fingerprint'}
            accessibilityLabel="Unlock with Face ID / fingerprint"
            disabled={busy}
            onPress={() => void handleBiometric(!biometricEnabled)}
          />
        ) : null}
        {biometricMessage ? (
          <AppText variant="bodyS" tone="danger" center accessibilityLiveRegion="polite">
            {biometricMessage}
          </AppText>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Version ${APP_VERSION}. Help`} onPress={() => setHelpOpen(true)} hitSlop={theme.spacing.s3}>
          <AppText variant="bodyS" tone="subtle" center>
            {`Version ${APP_VERSION} · `}
            <AppText variant="bodyS" tone="primary" bold>
              Help
            </AppText>
          </AppText>
        </Pressable>
      </View>

      <BottomSheet visible={helpOpen} title="Help signing in" onClose={() => setHelpOpen(false)}>
        <AppText>AVS and NParks officers sign in with their government account. Contractors use the account issued by their company.</AppText>
        <AppText tone="muted">If you can’t sign in, or don’t have an AQC role yet, contact the AQC system administrator.</AppText>
      </BottomSheet>
    </AuthLayout>
  );
}

interface SignInOptionProps {
  title: string;
  subtitle: string;
  icon: IconName;
  primary?: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

/** Sign-in choice card: --primary for officers, outlined for contractors. */
function SignInOption({ title, subtitle, icon, primary = false, loading, disabled, onPress, testID }: SignInOptionProps) {
  const inactive = disabled && !loading;
  const color = inactive ? theme.colors.disabled : primary ? theme.colors.onPrimary : theme.colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.option,
        primary ? styles.optionPrimary : styles.optionSecondary,
        inactive && styles.optionDisabled,
        pressed && (primary ? styles.optionPrimaryPressed : styles.optionPressed),
        focused && focusRing,
      ]}
    >
      <View style={[styles.optionIcon, primary && !inactive ? styles.optionIconPrimary : styles.optionIconSecondary]}>
        <Icon name={icon} size="md" color={primary && !inactive ? theme.colors.onPrimary : theme.colors.text} />
      </View>
      <View style={styles.flex}>
        <AppText variant="titleS" style={{ color }}>
          {title}
        </AppText>
        <AppText variant="bodyS" style={{ color: inactive ? theme.colors.disabled : primary ? theme.colors.primaryTint : theme.colors.text2 }}>
          {subtitle}
        </AppText>
      </View>
      {loading ? <ActivityIndicator color={color} /> : <Icon name="chevron-forward" size="sm" color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banners: { gap: theme.spacing.s3 },
  options: { gap: theme.spacing.s3 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s4,
    minHeight: 80,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
  },
  optionPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, ...shadow(2) },
  optionSecondary: { backgroundColor: theme.colors.surface, borderColor: theme.colors.lineStrong },
  optionDisabled: { backgroundColor: theme.colors.disabledSurface, borderColor: theme.colors.disabledSurface, shadowOpacity: 0, elevation: 0 },
  optionPrimaryPressed: { backgroundColor: theme.colors.primaryStrong },
  optionPressed: { backgroundColor: theme.colors.surface2 },
  optionIcon: { width: theme.control.iconBadge + 8, height: theme.control.iconBadge + 8, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center' },
  optionIconPrimary: { backgroundColor: theme.colors.inkLine },
  optionIconSecondary: { backgroundColor: theme.colors.surface2 },
  mfa: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s2, paddingTop: theme.spacing.s1 },
  flex: { flex: 1, gap: 2 },
  bottom: {
    gap: theme.spacing.s4,
    marginTop: 'auto',
    paddingTop: theme.spacing.s4,
    borderTopWidth: theme.control.borderWidth,
    borderTopColor: theme.colors.line,
  },
});

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import { AppText, Banner, Button } from '@/components';
import { theme } from '@/theme';

import { AuthLayout } from './AuthLayout';

/** Shown on reopen when "Unlock with Face ID / fingerprint" is on. Prompts automatically, with retry and sign-out. */
export function UnlockScreen() {
  const { unlock, signOut, session } = useSession();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(true); // the prompt opens automatically on mount

  const attempt = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const ok = await unlock();
    setBusy(false);
    if (!ok) setFailed(true);
  }, [unlock]);

  useEffect(() => {
    let active = true;
    void unlock().then((ok) => {
      if (!active) return;
      setBusy(false);
      setFailed(!ok);
    });
    return () => {
      active = false;
    };
  }, [unlock]);

  return (
    <AuthLayout title="AQC Animal Health is locked" subtitle={session?.name ? `Signed in as ${session.name}` : 'Animal Quarantine Centre · NParks / AVS'}>
      <AppText tone="muted">Use Face ID or your fingerprint to continue.</AppText>
      {failed ? <Banner kind="error" title="Could not unlock" message="Biometric check failed or was cancelled. Try again." /> : null}
      <View style={styles.actions}>
        <Button label="Unlock with Face ID / fingerprint" icon="finger-print" loading={busy} onPress={() => void attempt()} testID="unlock-retry" />
        <Button label="Sign out" variant="secondary" disabled={busy} onPress={() => void signOut()} testID="unlock-signout" />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  actions: { gap: theme.spacing.s3 },
});
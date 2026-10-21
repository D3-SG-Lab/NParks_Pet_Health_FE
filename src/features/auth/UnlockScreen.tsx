import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import { AppText, Banner, Button, Screen } from '@/components';
import { theme } from '@/theme';

/** Shown on reopen when "Unlock with biometrics" is on. Prompts automatically, with retry and sign-out. */
export function UnlockScreen() {
  const { unlock, signOut } = useSession();
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
    <Screen contentStyle={styles.content}>
      <AppText variant="title" center accessibilityRole="header">
        AQC Animal Health is locked
      </AppText>
      {failed ? (
        <Banner kind="error" title="Could not unlock" message="Biometric check failed or was cancelled. Try again." />
      ) : null}
      <View style={styles.actions}>
        <Button label="Unlock with biometrics" loading={busy} onPress={() => void attempt()} testID="unlock-retry" />
        <Button label="Sign out" variant="secondary" disabled={busy} onPress={() => void signOut()} testID="unlock-signout" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, justifyContent: 'center' },
  actions: { gap: theme.spacing.md },
});

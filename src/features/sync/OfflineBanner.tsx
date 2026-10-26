import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText, Icon, Pressable } from '@/components';
import { theme } from '@/theme';

import { useSyncState } from './hooks';

/**
 * Navy bar under the header when offline or while records wait to sync (screen 16 "Offline banner"):
 * "Offline · 4 records waiting to sync · View". Hidden when online with nothing pending.
 */
export function OfflineBanner() {
  const router = useRouter();
  const sync = useSyncState();
  const data = sync.data;
  if (!data || (data.online && data.items.length === 0)) return null;
  const count = data.items.length;
  const records = `${count} ${count === 1 ? 'record' : 'records'}`;
  const text = data.online ? (data.syncing ? `Syncing · ${records} left` : `${records} waiting to sync`) : `Offline · ${records} waiting to sync`;
  return (
    <Pressable
      testID="offline-banner"
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityHint="Opens pending sync"
      onPress={() => router.push('/sync')}
      style={({ pressed }: { pressed: boolean }) => [styles.bar, pressed && styles.pressed]}
    >
      <Icon name={data.online ? 'sync' : 'cloud-offline-outline'} size="sm" color={theme.colors.warningSoft} />
      <AppText variant="label" tone="inverse" style={styles.text}>
        {text}
      </AppText>
      <AppText variant="label" bold style={styles.view}>
        View
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    minHeight: theme.control.minTouch + 4,
    paddingHorizontal: theme.spacing.s4,
    backgroundColor: theme.colors.secondary,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
  view: { color: theme.colors.primaryTint },
});
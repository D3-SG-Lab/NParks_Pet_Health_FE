import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import { AppText, Avatar, BottomSheet, Button, Card, Icon, StatusChip, ToggleRow, Pressable } from '@/components';
import { useSetWorkOffline, useSyncState } from '@/features/sync/hooks';
import { theme } from '@/theme';

interface AccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Account menu behind the header avatar: who is signed in, connection, pending sync, sign out. */
export function AccountSheet({ visible, onClose }: AccountSheetProps) {
  const router = useRouter();
  const { session, role, signOut } = useSession();
  const sync = useSyncState();
  const setOffline = useSetWorkOffline();
  const [signingOut, setSigningOut] = useState(false);
  const name = session?.name?.trim() || (role === 'contractor' ? 'Contractor' : 'Officer');
  const pending = sync.data?.items.length ?? 0;
  const online = sync.data?.online ?? true;

  return (
    <BottomSheet visible={visible} title="Account" onClose={onClose} scroll testID="account-sheet">
      <View style={styles.identity}>
        <Avatar name={name} kind="person" size="lg" />
        <View style={styles.flex}>
          <AppText variant="titleL">{name}</AppText>
          <AppText tone="muted">{role === 'contractor' ? 'Contractor' : 'AVS / NParks officer'}</AppText>
          {session?.mock ? <StatusChip label="Demo session" tone="neutral" /> : null}
        </View>
      </View>

      <Card tone="muted" style={styles.group}>
        <ToggleRow
          testID="account-work-offline"
          label="Work offline (demo)"
          description="Simulates losing connection. Records are saved on this device and synced later."
          value={!online}
          onValueChange={(next) => setOffline.mutate(next)}
        />
        <Pressable
          testID="account-pending-sync"
          accessibilityRole="button"
          accessibilityLabel={`Pending sync, ${pending} records`}
          onPress={() => {
            onClose();
            router.push('/sync');
          }}
          style={({ pressed }: { pressed: boolean }) => [styles.link, pressed && styles.pressed]}
        >
          <Icon name="cloud-upload-outline" size="sm" color={theme.colors.text2} />
          <AppText variant="titleS" style={styles.flex}>
            Pending sync
          </AppText>
          <StatusChip label={pending ? `${pending} waiting` : 'All synced'} tone={pending ? 'info' : 'success'} />
          <Icon name="chevron-forward" size="sm" color={theme.colors.text3} />
        </Pressable>
      </Card>

      <Button
        label="Sign out"
        icon="log-out-outline"
        variant="dangerOutline"
        loading={signingOut}
        testID="account-signout"
        accessibilityHint={pending ? 'Records waiting to sync will be lost' : undefined}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
      {pending ? (
        <AppText variant="bodyS" tone="warning" center>
          {`${pending} ${pending === 1 ? 'record is' : 'records are'} still waiting to sync. Sign out after they're sent.`}
        </AppText>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: theme.spacing.s1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s4 },
  group: { gap: theme.spacing.s2, paddingVertical: theme.spacing.s2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2, minHeight: theme.control.minTouch },
  pressed: { opacity: 0.7 },
});
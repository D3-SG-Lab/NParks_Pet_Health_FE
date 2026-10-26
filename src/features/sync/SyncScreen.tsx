import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  type IconName,
  PageLayout,
  ProgressBar,
  ScreenHeader,
  SkeletonList,
  StatusChip,
  ToggleRow,
  type StatusTone,
} from '@/components';
import type { SyncItem, SyncKind } from '@/domain/types';
import { useGoBack } from '@/navigation/useGoBack';
import { theme } from '@/theme';

import { useRetrySyncItem, useSetWorkOffline, useSyncNow, useSyncState } from './hooks';

const STATUS: Record<SyncItem['status'], { label: (item: SyncItem) => string; tone: StatusTone }> = {
  waiting: { label: () => 'Waiting', tone: 'neutral' },
  uploading: { label: (item) => `Uploading ${Math.round(item.progress * 100)}%`, tone: 'info' },
  failed: { label: () => 'Failed', tone: 'danger' },
};

const KIND_ICON: Record<SyncKind, IconName> = {
  inspection: 'clipboard-outline',
  observation: 'camera-outline',
  medication: 'pill',
};

/** Screen 15: Offline & pending sync (FE-011, FE-018). Records are sent automatically, in order. */
export function SyncScreen() {
  const goBack = useGoBack('/');
  const sync = useSyncState();
  const syncNow = useSyncNow();
  const setOffline = useSetWorkOffline();
  const retry = useRetrySyncItem();
  const data = sync.data;
  const count = data?.items.length ?? 0;

  return (
    <PageLayout
      header={
        <ScreenHeader
          title="Pending sync"
          onBack={goBack}
          trailing={count > 0 ? <StatusChip label={String(count)} tone="neutral" testID="sync-count" /> : null}
        />
      }
      banner={
        data && !data.online ? (
          <View style={styles.offline} testID="sync-offline-bar">
            <Icon name="cloud-offline-outline" size="sm" color={theme.colors.warningSoft} />
            <AppText variant="label" tone="inverse" style={styles.flex}>{`You're offline. ${count} ${count === 1 ? 'record' : 'records'} saved on this device.`}</AppText>
          </View>
        ) : null
      }
      footer={
        <Button
          label={data && !data.online ? 'Sync now (offline)' : data?.syncing ? 'Syncing…' : 'Sync now'}
          icon="refresh"
          disabled={!data || !data.online || count === 0 || data.syncing}
          onPress={() => syncNow.mutate()}
          testID="sync-now"
        />
      }
    >
      <AppText variant="bodyS" tone="muted">
        {'Records sync automatically, in order, when you’re back online. '}
        <AppText variant="bodyS" bold>
          Don’t sign out until they’re sent.
        </AppText>
      </AppText>

      {sync.isPending ? (
        <SkeletonList label="Loading pending records" rows={3} />
      ) : sync.isError ? (
        <ErrorView message="We couldn't read the records on this device." onRetry={() => void sync.refetch()} />
      ) : count === 0 ? (
        <EmptyState testID="sync-empty" icon="cloud-done-outline" title="Everything is synced" message="Records you make offline are saved here until they are sent." />
      ) : (
        data?.items.map((item) => {
          const status = STATUS[item.status];
          return (
            <Card key={item.id} testID={`sync-item-${item.recordId}`} outline={item.status === 'failed' ? 'danger' : undefined} style={styles.item}>
              <View style={styles.row}>
                <View style={[styles.kind, item.status === 'failed' && styles.kindFailed]}>
                  <Icon name={KIND_ICON[item.kind]} size="sm" color={item.status === 'failed' ? theme.colors.danger : theme.colors.text2} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="titleS">{item.title}</AppText>
                  <AppText variant="bodyS" tone="muted">
                    {item.detail}
                  </AppText>
                </View>
                <StatusChip label={status.label(item)} tone={status.tone} dot={item.status === 'failed'} />
              </View>
              {item.status === 'uploading' ? <ProgressBar value={item.progress} label={`${item.title} uploading`} /> : null}
              {item.status === 'failed' ? (
                <View style={styles.failed}>
                  <AppText variant="bodyS" tone="danger">
                    Upload interrupted.
                  </AppText>
                  <Button label="Retry upload" icon="refresh" variant="dangerOutline" size="md" onPress={() => retry.mutate(item.id)} testID={`sync-retry-${item.recordId}`} />
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Card tone="muted">
        <ToggleRow
          testID="sync-work-offline"
          label="Work offline (demo)"
          description="Simulates losing connection. New inspections, observations and doses are kept on this device."
          value={data ? !data.online : false}
          onValueChange={(next) => setOffline.mutate(next)}
        />
      </Card>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
    backgroundColor: theme.colors.secondary,
  },
  item: { gap: theme.spacing.s3 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s3 },
  kind: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface2,
  },
  kindFailed: { backgroundColor: theme.colors.dangerSoft },
  failed: { gap: theme.spacing.s2, alignItems: 'flex-start' },
});
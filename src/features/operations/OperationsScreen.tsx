import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth';
import {
  Pressable,
  ActionTile,
  Avatar,
  Banner,
  Card,
  EmptyState,
  ErrorView,
  FadeIn,
  HeaderIconButton,
  LinkButton,
  ListRow,
  PageLayout,
  ScreenHeader,
  SearchField,
  SectionLabel,
  SkeletonList,
  StatCard,
  StatusChip,
  type StatusTone,
} from '@/components';
import type { AlertKind } from '@/domain/types';
import { AnimalPicker } from '@/features/animals/AnimalPicker';
import { useNotifications } from '@/features/notifications/NotificationsProvider';
import { AccountSheet } from '@/features/shell/AccountSheet';
import { OfflineBanner } from '@/features/sync/OfflineBanner';
import { theme } from '@/theme';
import { formatTime, formatWeekdayDate, relativeTime, sessionFor } from '@/utils/dates';
import { useNow } from '@/utils/useNow';

import { useOperationsSummary } from './hooks';

const ALERT_CHIP: Record<AlertKind, { label: string; tone: StatusTone }> = {
  review: { label: 'Review', tone: 'warning' },
  open: { label: 'Open', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
};

/** Screen 2: Operations home (FE-004, FE-005). Quick actions, today's monitoring, review banner, alerts. */
export function OperationsScreen() {
  const router = useRouter();
  const { session, role } = useSession();
  const notifications = useNotifications();
  const summary = useOperationsSummary();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const isOfficer = role === 'officer';
  const name = session?.name?.trim() || (isOfficer ? 'Officer' : 'Contractor');
  const now = useNow(60_000);
  const data = summary.data;

  return (
    <PageLayout
      width="wide"
      edges={['top', 'left', 'right']}
      refreshing={summary.isRefetching}
      onRefresh={() => void summary.refetch()}
      banner={<OfflineBanner />}
      header={
        <ScreenHeader
          large
          eyebrowIcon="time-outline"
          eyebrow={`${formatWeekdayDate(now)} · ${sessionFor(new Date(now))} session`}
          title="Operations"
          trailing={
            <>
              <HeaderIconButton
                testID="operations-bell"
                icon="notifications-outline"
                label="Notifications"
                badge={notifications.unread || (data?.alerts.length ? 1 : 0)}
                onPress={notifications.openCentre}
              />
              <Pressable
                testID="operations-account"
                accessibilityRole="button"
                accessibilityLabel={`Account, ${name}`}
                onPress={() => setAccountOpen(true)}
                hitSlop={theme.spacing.s1}
              >
                <Avatar name={name} kind="person" />
              </Pressable>
            </>
          }
          below={
            <SearchField
              testID="operations-search"
              value=""
              placeholder="Search kennel code, name or microchip"
              onPress={() => setSearchOpen(true)}
            />
          }
        />
      }
    >
      <View style={styles.section}>
        <SectionLabel>Quick actions</SectionLabel>
        <View style={styles.actions}>
          {isOfficer ? (
            <ActionTile
              testID="operations-new-arrival"
              label="New Arrival"
              description="Register & baseline exam"
              icon="add"
              variant="primary"
              onPress={() => router.navigate('/new-arrival')}
            />
          ) : null}
          <ActionTile
            testID="operations-new-observation"
            label="New Health Observation"
            description="Photo, video or text"
            icon="camera-outline"
            variant={isOfficer ? 'secondary' : 'primary'}
            onPress={() => router.push('/new-observation')}
          />
        </View>
      </View>

      {summary.isPending ? (
        <SkeletonList label="Loading operations" rows={3} testID="operations-loading" />
      ) : summary.isError || !data ? (
        <ErrorView testID="operations-error" message="Check your connection and try again." onRetry={() => void summary.refetch()} />
      ) : (
        <FadeIn style={styles.sections}>
          <View style={styles.section}>
            <SectionLabel trailing={`Updated ${formatTime(data.updatedAt)} · pull to refresh`}>{'Today’s monitoring'}</SectionLabel>
            <View style={styles.stats}>
              <StatCard
                testID="stat-active-pets"
                value={data.activePets}
                label="Active pets"
                accessibilityHint="Opens the animal list"
                onPress={() => setSearchOpen(true)}
              />
              <StatCard
                testID="stat-checks-due"
                value={data.checksDue}
                label={`Checks due · ${data.session}`}
                progress={data.activePets ? (data.activePets - data.checksDue) / data.activePets : 0}
                accessibilityHint="Opens daily inspection"
                onPress={() => router.navigate('/daily-inspection')}
              />
              <StatCard
                testID="stat-open-cases"
                value={data.openCases}
                label="Open cases"
                tone={data.openCases > 0 ? 'attention' : 'default'}
                accessibilityHint="Opens health cases"
                onPress={() => router.navigate('/cases')}
              />
            </View>
          </View>

          {isOfficer && data.observationsNeedingReview > 0 ? (
            <Banner
              testID="operations-review-banner"
              kind="warning"
              iconTile
              icon="sparkles-outline"
              title={reviewText(data.observationsNeedingReview)}
              message="AI unmatched or low confidence"
              accessibilityHint="Opens the review queue"
              onPress={() => router.push('/review-queue')}
            />
          ) : null}

          <View style={styles.section}>
            <SectionLabel trailing={<LinkButton label="View all" accessibilityLabel="View all cases" onPress={() => router.navigate('/cases')} />}>
              Alerts
            </SectionLabel>
            {data.alerts.length === 0 ? (
              <EmptyState testID="operations-no-alerts" icon="checkmark-done-outline" title="No alerts right now" message="Reviews, follow-ups and reopened cases will appear here." />
            ) : (
              <Card padded={false}>
                {data.alerts.map((alert, index) => {
                  const chip = ALERT_CHIP[alert.kind];
                  return (
                    <ListRow
                      key={alert.id}
                      testID={`alert-${alert.id}`}
                      variant="flat"
                      divider={index < data.alerts.length - 1}
                      leading={<Avatar name={alert.animalName} />}
                      code={alert.kennel}
                      title={alert.animalName}
                      body={alert.message}
                      subtitle={alert.meta ?? relativeTime(alert.at, now)}
                      accessibilityHint={alert.caseId ? 'Opens the case' : 'Opens the inspection'}
                      trailing={<StatusChip label={chip.label} tone={chip.tone} />}
                      onPress={() =>
                        alert.caseId
                          ? router.push({ pathname: '/case/[id]', params: { id: alert.caseId } })
                          : router.push({ pathname: '/inspect/[animalId]', params: { animalId: alert.animalId } })
                      }
                    />
                  );
                })}
              </Card>
            )}
          </View>
        </FadeIn>
      )}

      <AnimalPicker
        visible={searchOpen}
        title="Find an animal"
        onClose={() => setSearchOpen(false)}
        onSelect={(animal) => router.push({ pathname: '/animal/[id]', params: { id: animal.id } })}
      />
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </PageLayout>
  );
}

function reviewText(count: number): string {
  return `${count} ${count === 1 ? 'observation needs' : 'observations need'} review`;
}

const styles = StyleSheet.create({
  sections: { gap: theme.spacing.s6 },
  section: { gap: theme.spacing.s3 },
  actions: { flexDirection: 'row', gap: theme.spacing.s3 },
  stats: { flexDirection: 'row', gap: theme.spacing.s2 },
});

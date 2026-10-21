import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ScrollView } from 'react-native';

import { useSession } from '@/auth';
import {
  ActionTile,
  AppText,
  Avatar,
  Button,
  Card,
  ErrorView,
  FadeIn,
  HeaderIconButton,
  Icon,
  ListRow,
  LoadingView,
  PageLayout,
  ScreenHeader,
  SectionLabel,
  StatCard,
  StatusChip,
  useToast,
} from '@/components';
import { theme } from '@/theme';

import { useOperationsSummary } from './hooks';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Wireframe 01: Operations home. Quick actions, today's monitoring, review banner and alerts. */
export function OperationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session, role, signOut } = useSession();
  const summary = useOperationsSummary();
  const [signingOut, setSigningOut] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Offsets for the bell button: the alerts block's position inside its wrapper plus the wrapper's own.
  const sectionsY = useRef(0);
  const alertsY = useRef(0);

  const isOfficer = role === 'officer';
  const name = session?.name?.trim();
  const greeting = `${greetingFor(new Date().getHours())}${name ? `, ${name}` : ''}`;
  const data = summary.data;
  const alertCount = data?.alerts.length ?? 0;

  // Destinations that belong to other wireframes are not built yet; say so instead of doing nothing.
  const notAvailable = (feature: string) => toast.show(`${feature} is not available yet.`, 'info');

  return (
    <PageLayout
      width="wide"
      edges={['top', 'left', 'right']}
      scrollRef={scrollRef}
      header={
        <ScreenHeader
          eyebrow={greeting}
          title="Operations"
          trailing={
            <HeaderIconButton
              testID="operations-bell"
              icon="notifications-outline"
              label="Alerts"
              badge={alertCount}
              onPress={() => 
                scrollRef.current?.scrollTo({ y: sectionsY.current + alertsY.current, animated: true })
              }
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
              icon="add"
              onPress={() => router.navigate('/new-arrival')}
            />
          ) : null}
          <ActionTile
            testID="operations-new-observation"
            label="New Health Observation"
            icon="camera-outline"
            variant="primary"
            onPress={() => notAvailable('New Health Observation')}
          />
        </View>
      </View>

      {summary.isPending ? (
        <View style={styles.state}>
          <LoadingView label="Loading operations" testID="operations-loading" />
        </View>
      ) : summary.isError || !data ? (
        <ErrorView
          testID="operations-error"
          message="We couldn't load today's monitoring. Check your connection and try again."
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <FadeIn>
          <View
            style={styles.sections}
            onLayout={(event) => {
              sectionsY.current = event.nativeEvent.layout.y;
            }}
          >
            <View style={styles.section}>
              <SectionLabel>{'Today’s monitoring'}</SectionLabel>
              <View style={styles.stats}>
                <StatCard testID="stat-active-pets" value={data.activePets} label="Active pets" />
                <StatCard testID="stat-checks-due" value={data.checksDueAm} label="Checks due · AM" />
                <StatCard testID="stat-open-cases" value={data.openCases} label="Open cases" />
              </View>
            </View>

            <Pressable
              testID="operations-review-banner"
              accessibilityRole="button"
              accessibilityLabel={`${data.observationsNeedingReview} observations need manual review`}
              onPress={() => notAvailable('The review queue')}
              style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
                styles.review,
                pressed && styles.pressed,
                focused && styles.focused,
              ]}
            >
              <AppText bold style={styles.reviewText}>
                {`${data.observationsNeedingReview} observations need manual review`}
              </AppText>
              <Icon name="chevron-forward" color={theme.colors.info} />
            </Pressable>

            <View
              style={styles.section}
              onLayout={(event) => {
                alertsY.current = event.nativeEvent.layout.y;
              }}
            >
              <SectionLabel>Alerts</SectionLabel>
              {data.alerts.length === 0 ? (
                <Card testID="operations-no-alerts">
                  <AppText bold center>
                    No alerts right now
                  </AppText>
                  <AppText tone="muted" center>
                    New alerts about reviews, follow-ups and reopened cases will appear here.
                  </AppText>
                </Card>
              ) : (
                data.alerts.map((alert) => (
                  <ListRow
                    key={alert.id}
                    testID={`alert-${alert.id}`}
                    leading={<Avatar name={alert.animalName} />}
                    title={`${alert.kennel} ${alert.animalName}`}
                    subtitle={alert.message}
                    accessibilityHint="Opens health cases"
                    trailing={
                      <StatusChip
                        label={alert.kind === 'review' ? 'Review' : 'Open'}
                        tone={alert.kind === 'review' ? 'review' : 'attention'}
                      />
                    }
                    onPress={() => router.navigate('/cases')}
                  />
                ))
              )}
            </View>
          </View>
        </FadeIn>
      )}

      <Button
        label="Sign out"
        icon="log-out-outline"
        variant="secondary"
        testID="operations-signout"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.spacing.lg },
  section: { gap: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  stats: { flexDirection: 'row', gap: theme.spacing.md },
  state: { minHeight: theme.control.thumb * 3 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: theme.control.minTouch,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.infoSurface,
  },
  reviewText: { flex: 1, color: theme.colors.info },
  pressed: { opacity: 0.85 },
  focused: { borderWidth: theme.control.focusWidth, borderColor: theme.colors.focus },
});

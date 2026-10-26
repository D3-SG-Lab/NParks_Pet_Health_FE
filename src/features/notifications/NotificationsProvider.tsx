import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, BottomSheet, EmptyState, FadeIn, Icon, Pressable } from '@/components';
import type { AppNotification } from '@/domain/types';
import { shadow, theme } from '@/theme';
import { relativeTime } from '@/utils/dates';

import { getDemoPush } from './notificationsApi';

interface NotificationsApi {
  notifications: AppNotification[];
  unread: number;
  openCentre: () => void;
  receive: (notification: AppNotification) => void;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);

const HEADS_UP_MS = 6000;
/** Demo push arrives this long after sign-in (never under Jest). */
const DEMO_PUSH_DELAY_MS = 8000;

/**
 * In-app notification centre (FE-019): shows incoming pushes as a heads-up card at the top (tap opens
 * the case or animal), keeps them in a list behind the Operations bell, and tracks unread.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [headsUp, setHeadsUp] = useState<AppNotification | null>(null);
  const [centreOpen, setCentreOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const receive = useCallback((notification: AppNotification) => {
    setNotifications((list) => [notification, ...list.filter((n) => n.id !== notification.id)]);
    setHeadsUp(notification);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHeadsUp(null), HEADS_UP_MS);
  }, []);

  const open = useCallback(
    (notification: AppNotification) => {
      setReadIds((ids) => new Set(ids).add(notification.id));
      setHeadsUp(null);
      setCentreOpen(false);
      if (notification.target.kind === 'case') router.push({ pathname: '/case/[id]', params: { id: notification.target.caseId } });
      else router.push({ pathname: '/animal/[id]', params: { id: notification.target.animalId } });
    },
    [router],
  );

  // Demo: one push shortly after sign-in.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    const demo = setTimeout(() => {
      void getDemoPush().then((push) => {
        if (push) receive(push);
      });
    }, DEMO_PUSH_DELAY_MS);
    return () => {
      clearTimeout(demo);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [receive]);

  const unread = notifications.filter((n) => !readIds.has(n.id)).length;
  const api = useMemo<NotificationsApi>(
    () => ({ notifications, unread, openCentre: () => setCentreOpen(true), receive }),
    [notifications, unread, receive],
  );

  return (
    <NotificationsContext.Provider value={api}>
      {children}
      {headsUp ? (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + theme.spacing.s2 }]}>
          <FadeIn key={headsUp.id}>
            <Pressable
              testID="push-heads-up"
              accessibilityRole="button"
              accessibilityLabel={`Notification. ${headsUp.title}. ${headsUp.body}`}
              accessibilityLiveRegion="polite"
              onPress={() => open(headsUp)}
              style={({ pressed }: { pressed: boolean }) => [styles.card, pressed && styles.pressed]}
            >
              <NotificationContent notification={headsUp} time="now" />
            </Pressable>
          </FadeIn>
        </View>
      ) : null}
      <BottomSheet visible={centreOpen} title="Notifications" onClose={() => setCentreOpen(false)} scroll testID="notifications-sheet">
        {notifications.length === 0 ? (
          <EmptyState icon="notifications-off-outline" title="No notifications" message="Case updates and reopened cases will appear here." />
        ) : (
          notifications.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.title}. ${n.body}`}
              onPress={() => open(n)}
              style={({ pressed }: { pressed: boolean }) => [styles.listItem, pressed && styles.pressed]}
            >
              <NotificationContent notification={n} time={relativeTime(n.at)} unread={!readIds.has(n.id)} />
            </Pressable>
          ))
        )}
      </BottomSheet>
    </NotificationsContext.Provider>
  );
}

function NotificationContent({ notification, time, unread }: { notification: AppNotification; time: string; unread?: boolean }) {
  return (
    <>
      <View style={styles.appIcon}>
        <Icon name="shield-checkmark-outline" size="md" color={theme.colors.onPrimary} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <AppText variant="overline" tone="muted" style={styles.flex}>
            AQC Animal Health
          </AppText>
          <AppText variant="caption" tone="subtle">
            {time}
          </AppText>
          {unread ? <View style={styles.unread} /> : null}
        </View>
        <AppText variant="titleS">{notification.title}</AppText>
        <AppText variant="bodyS" tone="muted">
          {notification.body}
        </AppText>
      </View>
    </>
  );
}

export function useNotifications(): NotificationsApi {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside <NotificationsProvider>.');
  return value;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: theme.spacing.s3, right: theme.spacing.s3, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
    width: '100%',
    maxWidth: theme.control.formMaxWidth,
    padding: theme.spacing.s3 + 2,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    ...shadow(2),
  },
  listItem: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  pressed: { opacity: 0.85 },
  appIcon: {
    width: theme.control.iconBadge + 4,
    height: theme.control.iconBadge + 4,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  unread: { width: 8, height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
});
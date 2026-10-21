import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, FadeIn, Icon, Screen, type IconName } from '@/components';
import { theme } from '@/theme';

interface PlaceholderScreenProps {
  title: string;
  icon: IconName;
  children?: ReactNode;
}

/** Temporary tab content until the real screens (later features) replace it. */
export function PlaceholderScreen({ title, icon, children }: PlaceholderScreenProps) {
  return (
    <Screen wide edges={['top', 'left', 'right']} contentStyle={styles.content}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <FadeIn>
        <Card style={styles.card}>
          <View style={styles.badge}>
            <Icon name={icon} size="lg" color={theme.colors.primary} />
          </View>
          <AppText bold center>
            Coming soon
          </AppText>
          <AppText tone="muted" center>
            This screen is not built yet.
          </AppText>
        </Card>
      </FadeIn>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  card: { alignItems: 'center', padding: theme.spacing.xxl },
  badge: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

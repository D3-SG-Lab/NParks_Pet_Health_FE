import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  /** Optional call to action, usually a Button. */
  action?: ReactNode;
  testID?: string;
}

/** "Nothing here" card (FE-025 empty state, e.g. "No open cases · All animals in your kennels are well today."). */
export function EmptyState({ icon, title, message, action, testID }: EmptyStateProps) {
  return (
    <Card testID={testID} style={styles.card}>
      <View style={styles.badge}>
        <Icon name={icon} size="md" color={theme.colors.success} />
      </View>
      <View style={styles.text}>
        <AppText variant="titleS" center>
          {title}
        </AppText>
        <AppText variant="bodyS" tone="muted" center>
          {message}
        </AppText>
      </View>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: theme.spacing.s4, paddingVertical: theme.spacing.s6, paddingHorizontal: theme.spacing.s4 },
  text: { gap: theme.spacing.s1, alignItems: 'center' },
  badge: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
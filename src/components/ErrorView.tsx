import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';

interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  testID?: string;
}

/** Error state card with retry (wireframe: "Couldn't load this page · Check your connection and try again."). */
export function ErrorView({ title = "Couldn't load this page", message, onRetry, testID }: ErrorViewProps) {
  return (
    <View style={styles.wrap}>
      <Card testID={testID} style={styles.card}>
        <View style={styles.badge}>
          <Icon name="cloud-offline-outline" size="md" color={theme.colors.danger} />
        </View>
        <AppText variant="titleS" center accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="bodyS" tone="muted" center accessibilityLiveRegion="polite">
          {message}
        </AppText>
        {onRetry ? <Button label="Try again" icon="refresh" variant="secondary" size="md" onPress={onRetry} style={styles.retry} /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: theme.spacing.s4 },
  card: { alignItems: 'center', paddingVertical: theme.spacing.s6 },
  badge: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { minWidth: 140 },
});
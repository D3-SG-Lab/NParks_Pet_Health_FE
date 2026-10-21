import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

interface ErrorViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  testID?: string;
}

/** Full-area error state with an optional retry action. */
export function ErrorView({ title = 'Something went wrong', message, onRetry, testID }: ErrorViewProps) {
  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.badge}>
        <Icon name="alert-circle-outline" size="lg" color={theme.colors.danger} />
      </View>
      <AppText variant="bodyLarge" bold center accessibilityRole="header">
        {title}
      </AppText>
      <AppText tone="muted" center accessibilityLiveRegion="polite">
        {message}
      </AppText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
  badge: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

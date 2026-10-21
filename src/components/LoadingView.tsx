import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface LoadingViewProps {
  label?: string;
  testID?: string;
}

/** Full-area loading state. */
export function LoadingView({ label = 'Loading', testID }: LoadingViewProps) {
  return (
    <View
      testID={testID}
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
});

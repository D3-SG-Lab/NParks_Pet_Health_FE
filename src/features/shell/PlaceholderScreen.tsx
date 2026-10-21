import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { AppText, Card, Screen } from '@/components';
import { theme } from '@/theme';

interface PlaceholderScreenProps {
  title: string;
  children?: ReactNode;
}

/** Temporary tab content until the real screens (later features) replace it. */
export function PlaceholderScreen({ title, children }: PlaceholderScreenProps) {
  return (
    <Screen edges={['top', 'left', 'right']} contentStyle={styles.content}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <Card>
        <AppText tone="muted">This screen is not built yet.</AppText>
      </Card>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
});

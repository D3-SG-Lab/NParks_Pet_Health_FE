import { StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';

interface StatCardProps {
  value: number;
  label: string;
  testID?: string;
}

/** Single metric tile ("12 / Active pets"). Read as one item: "Active pets, 12". */
export function StatCard({ value, label, testID }: StatCardProps) {
  return (
    <Card testID={testID} style={styles.card}>
      <AppText variant="headline" accessibilityLabel={`${label}, ${value}`} accessible>
        {String(value)}
      </AppText>
      <AppText tone="muted" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: theme.spacing.xs, padding: theme.spacing.md },
});

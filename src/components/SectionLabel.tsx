import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface SectionLabelProps {
  children: string;
  /** Right-aligned extra on the same line (e.g. "Updated 08:42 · pull to refresh" or a link). */
  trailing?: ReactNode;
}

/** Overline section header (QUICK ACTIONS, BODY SYSTEMS, …) with an optional trailing slot. */
export function SectionLabel({ children, trailing }: SectionLabelProps) {
  const label = (
    <AppText variant="overline" tone="muted" accessibilityRole="header">
      {children.toUpperCase()}
    </AppText>
  );
  if (!trailing) return label;
  return (
    <View style={styles.row}>
      {label}
      {typeof trailing === 'string' ? (
        <AppText variant="caption" tone="subtle" style={styles.trailingText}>
          {trailing}
        </AppText>
      ) : (
        trailing
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.s2, flexWrap: 'wrap', minHeight: 24 },
  trailingText: { flexShrink: 1, textAlign: 'right' },
});

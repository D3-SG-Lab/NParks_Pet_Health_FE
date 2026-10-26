import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

export interface InfoRow {
  label: string;
  value: string;
  /** Small "auto" tag: the value was filled in automatically (time, officer). */
  auto?: boolean;
  /** Plex Mono value (times, IDs). */
  mono?: boolean;
}

interface InfoRowsProps {
  rows: readonly InfoRow[];
  testID?: string;
}

/** Label/value table on a muted panel (wireframe "Record administration": Item, Dose, Time, Officer). */
export function InfoRows({ rows, testID }: InfoRowsProps) {
  return (
    <View style={styles.panel} testID={testID}>
      {rows.map((row, index) => (
        <View key={row.label} style={[styles.row, index > 0 && styles.divider]} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
          <AppText variant="bodyS" tone="muted">
            {row.label}
          </AppText>
          <View style={styles.valueRow}>
            <AppText variant={row.mono ? 'mono' : 'bodyS'} bold style={styles.value}>
              {row.value}
            </AppText>
            {row.auto ? (
              <View style={styles.auto}>
                <AppText variant="caption" tone="primary">
                  auto
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    paddingHorizontal: theme.spacing.s4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.s3, minHeight: theme.control.minTouch, paddingVertical: theme.spacing.s2 },
  divider: { borderTopWidth: theme.control.borderWidth, borderTopColor: theme.colors.line },
  valueRow: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  value: { flexShrink: 1, textAlign: 'right' },
  auto: { paddingHorizontal: theme.spacing.s1 + 2, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primarySoft },
});
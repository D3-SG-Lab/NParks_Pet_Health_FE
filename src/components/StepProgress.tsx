import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface StepProgressProps {
  step: number;
  total: number;
  /** "Step 1 of 2 · Animal details". */
  label?: string;
  /** Right-hand context, e.g. "Next: Arrival exam" or "KC2-2 · Yang Yang · Dog". */
  aside?: ReactNode;
}

/** C5 task app bar step + progress: "Step 1 of 2 · Animal details" over a segmented bar. */
export function StepProgress({ step, total, label, aside }: StepProgressProps) {
  return (
    <View style={styles.wrap}>
      {label || aside ? (
        <View style={styles.labels}>
          {label ? (
            <AppText variant="label" bold style={styles.label}>
              {label}
            </AppText>
          ) : null}
          {typeof aside === 'string' ? (
            <AppText variant="bodyS" tone="muted" style={styles.aside} numberOfLines={1}>
              {aside}
            </AppText>
          ) : (
            aside
          )}
        </View>
      ) : null}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label ?? `Step ${step} of ${total}`}
        accessibilityValue={{ min: 1, max: total, now: step }}
        style={styles.track}
      >
        {Array.from({ length: total }, (_, index) => (
          <View key={index} style={[styles.segment, index < step && styles.done]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.s2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.s3 },
  label: { flexShrink: 0 },
  aside: { flexShrink: 1, textAlign: 'right' },
  track: { flexDirection: 'row', gap: theme.spacing.s2 },
  segment: { flex: 1, height: theme.control.progressHeight - 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primaryTint },
  done: { backgroundColor: theme.colors.primary },
});
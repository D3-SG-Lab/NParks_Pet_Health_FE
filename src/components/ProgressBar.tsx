import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

interface ProgressBarProps {
  /** 0..1. */
  value: number;
  /** Spoken name, e.g. "AM session progress". */
  label: string;
  /** primary on the --primary-tint track; info for uploads; inverse on dark tiles. */
  tone?: 'primary' | 'info' | 'inverse';
  testID?: string;
}

/** Thin determinate progress bar (session progress, upload progress). */
export function ProgressBar({ value, label, tone = 'primary', testID }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  const fill = tone === 'info' ? theme.colors.info : tone === 'inverse' ? theme.colors.primaryTint : theme.colors.primary;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, tone === 'inverse' ? styles.trackInverse : tone === 'info' ? styles.trackInfo : null]}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: theme.control.progressHeight,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryTint,
    overflow: 'hidden',
  },
  trackInfo: { backgroundColor: theme.colors.line },
  trackInverse: { backgroundColor: theme.colors.inkLine },
  fill: { height: '100%', borderRadius: theme.radius.pill },
});

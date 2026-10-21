import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

interface StepProgressProps {
  step: number;
  total: number;
}

/** Thin segmented bar under the header showing "Step n of total". */
export function StepProgress({ step, total }: StepProgressProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${(step / total) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: theme.control.progressHeight, backgroundColor: theme.colors.divider },
  fill: { height: '100%', backgroundColor: theme.colors.primary },
});

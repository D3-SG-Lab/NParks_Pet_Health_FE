import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

/**
 * Status colour meanings from the wireframe style guide:
 * review = blue, attention (Open / Due / Overdue / Abnormal) = amber, done (Done / Recorded) = green,
 * closed (Closed / Disabled) = grey.
 */
export type StatusTone = 'review' | 'attention' | 'done' | 'closed';

const palette: Record<StatusTone, { background: string; text: string }> = {
  review: { background: theme.colors.infoSurface, text: theme.colors.info },
  attention: { background: theme.colors.warningSurface, text: theme.colors.warning },
  done: { background: theme.colors.primarySurface, text: theme.colors.primary },
  closed: { background: theme.colors.disabledSurface, text: theme.colors.textMuted },
};

interface StatusChipProps {
  label: string;
  tone: StatusTone;
  testID?: string;
}

export function StatusChip({ label, tone, testID }: StatusChipProps) {
  const colors = palette[tone];
  return (
    <View testID={testID} style={[styles.chip, { backgroundColor: colors.background }]}>
      <AppText variant="caption" bold style={{ color: colors.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
});

import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

/**
 * C4 Status badge — one mapping everywhere (design system "Status" palette):
 * success: Done, Recorded, Active, Uploaded · warning: Review, Open case due, Offline, No match ·
 * abnormal: Unwell, abnormal finding · danger: Overdue, Failed, errors · info: Open, Due now, Uploading,
 * low confidence · neutral: Closed, Waiting, "PM due".
 */
export type StatusTone = 'success' | 'warning' | 'abnormal' | 'danger' | 'info' | 'neutral';

const palette: Record<StatusTone, { background: string; text: string }> = {
  success: { background: theme.colors.successSoft, text: theme.colors.success },
  warning: { background: theme.colors.warningSoft, text: theme.colors.warning },
  abnormal: { background: theme.colors.abnormalSoft, text: theme.colors.abnormal },
  danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
  info: { background: theme.colors.infoSoft, text: theme.colors.info },
  neutral: { background: theme.colors.surface2, text: theme.colors.text2 },
};

interface StatusChipProps {
  label: string;
  tone: StatusTone;
  /** Leading dot for record states (default for every tone except neutral); off for counts. */
  dot?: boolean;
  testID?: string;
}

/** Pill badge, 24 tall. */
export function StatusChip({ label, tone, dot = tone !== 'neutral', testID }: StatusChipProps) {
  const colors = palette[tone];
  return (
    <View testID={testID} style={[styles.chip, { backgroundColor: colors.background }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: colors.text }]} /> : null}
      <AppText variant="caption" bold numberOfLines={1} style={{ color: colors.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
    gap: theme.spacing.s1 + 2,
    minHeight: theme.control.badge,
    paddingHorizontal: theme.spacing.s2 + 2,
    borderRadius: theme.radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: theme.radius.pill },
});

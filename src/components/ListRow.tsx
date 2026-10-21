import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading element, usually an Avatar. */
  leading?: ReactNode;
  /** Trailing element, usually a StatusChip. */
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Tappable card row (alerts, cases, animals). The whole row is a single button. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.row,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      {leading}
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.control.minTouch,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.divider,
  },
  pressed: { backgroundColor: theme.colors.background },
  focused: { borderColor: theme.colors.focus, borderWidth: theme.control.focusWidth },
  text: { flex: 1, gap: theme.spacing.xs },
});

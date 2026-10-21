import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** Labelled switch row. The whole row is the single accessible switch (checked state announced). */
export function ToggleRow({ label, description, value, onValueChange, disabled = false, testID }: ToggleRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.row, focused && styles.focused]}
    >
      <View style={styles.text}>
        <AppText bold>{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {/* Decorative: the row above carries the semantics. */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch
          value={value}
          disabled={disabled}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.surface}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: theme.control.minTouch,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  focused: {
    borderWidth: theme.control.focusWidth,
    borderColor: theme.colors.focus,
  },
  text: { flex: 1, gap: theme.spacing.xs },
});

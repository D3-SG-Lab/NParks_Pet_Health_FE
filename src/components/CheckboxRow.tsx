import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { focusRing, theme, webFocusReset } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Trailing element, e.g. "Due 16:00". */
  trailing?: ReactNode;
  /** Draw a hairline under the row (stacked lists). */
  divider?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** C3 checkbox (off / on / disabled) with label (case follow-up actions, taxonomy). Checked items are struck through. */
export function CheckboxRow({ label, checked, onChange, trailing, divider = false, disabled = false, testID }: CheckboxRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, divider && styles.divider, webFocusReset]}
    >
      {({ pressed, focused }) => (
        <>
          {/* Keyboard focus and press feedback sit on the box itself, like the C3 checkbox. */}
          <View
            style={[
              styles.box,
              checked && styles.boxChecked,
              pressed && !checked && styles.boxPressed,
              disabled && styles.boxDisabled,
              focused && focusRing,
            ]}
          >
            {checked ? <Icon name="checkmark" size="sm" color={disabled ? theme.colors.text3 : theme.colors.onPrimary} /> : null}
          </View>
          <AppText tone={checked || disabled ? 'subtle' : 'default'} style={[styles.label, checked && styles.done]}>
            {label}
          </AppText>
          {trailing}
        </>
      )}
    </Pressable>
  );
}

const BOX = 24;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3, minHeight: theme.control.minTouch + 4, borderRadius: theme.radius.sm },
  divider: { borderBottomWidth: theme.control.borderWidth, borderBottomColor: theme.colors.line },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  boxPressed: { borderColor: theme.colors.primary },
  boxDisabled: { backgroundColor: theme.colors.surface2, borderColor: theme.colors.line },
  label: { flex: 1 },
  done: { textDecorationLine: 'line-through' },
});
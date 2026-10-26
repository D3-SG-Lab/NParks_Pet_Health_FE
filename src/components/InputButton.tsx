import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { inputStates, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';
import { inputBaseStyle } from './TextField';

interface InputButtonProps {
  /** Shown in --text-3 when there is no value. */
  placeholder: string;
  /** The chosen value, or a node (e.g. avatar + kennel code + name). */
  value?: ReactNode;
  /** Leading icon (e.g. search) shown before the placeholder. */
  icon?: IconName;
  /** Trailing icon; a chevron by default (C2 dropdown closed). */
  trailingIcon?: IconName | null;
  /** The picker it opens is showing (C2 dropdown open: focused edge, chevron up). */
  open?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

/** A C2 field that opens a picker (animal picker, full-screen lists) instead of taking typed text. */
export function InputButton({
  placeholder,
  value,
  icon,
  trailingIcon = 'chevron-down',
  open = false,
  invalid = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: InputButtonProps) {
  const chevron = trailingIcon === 'chevron-down' && open ? 'chevron-up' : trailingIcon;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.field,
        pressed && styles.pressed,
        disabled && inputStates.disabled,
        invalid ? inputStates.invalid : focused || open ? inputStates.focused : null,
      ]}
    >
      {icon ? <Icon name={icon} size="sm" color={theme.colors.text2} /> : null}
      <View style={styles.value}>
        {value ?? (
          <AppText tone="subtle" numberOfLines={1}>
            {placeholder}
          </AppText>
        )}
      </View>
      {chevron ? <Icon name={chevron} size="sm" color={disabled ? theme.colors.text3 : open ? theme.colors.primary : theme.colors.text2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { ...inputBaseStyle, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 },
  value: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  pressed: { backgroundColor: theme.colors.surface2 },
});

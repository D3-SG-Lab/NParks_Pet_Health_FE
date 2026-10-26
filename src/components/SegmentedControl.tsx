import { StyleSheet, View } from 'react-native';

import { focusRing, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** 'abnormal' fills the selected segment with --abnormal (Abnormal, abnormal stool). */
  tone?: 'default' | 'abnormal';
  /** Leading icon (sun / moon for sessions). */
  icon?: IconName;
  /** Icon shown only while selected (✓ Normal, ! Abnormal). */
  selectedIcon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  /** Spoken name of the whole group, e.g. "Species". Announced once for the group. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (next: T) => void;
  /**
   * C3 segmented control (≤ 4 options, replaces dropdowns): a --surface-2 track whose selected segment
   * is a raised white pill. 'inverse' is the navy session switch (AM / PM).
   */
  variant?: 'track' | 'inverse';
  /** md: form rows (52 track). sm: exam toggles in body-system rows (44 track). */
  size?: 'sm' | 'md';
  disabled?: boolean;
  testID?: string;
}

/** Single-choice control. Exposed to screen readers as one radio group. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'track',
  size = 'md',
  disabled = false,
  testID,
}: SegmentedControlProps<T>) {
  const inverse = variant === 'inverse';
  return (
    <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, inverse && styles.trackInverse]}>
      {options.map((option) => {
        const selected = option.value === value;
        const abnormal = selected && option.tone === 'abnormal';
        const color = abnormal
          ? theme.colors.onPrimary
          : selected
            ? option.selectedIcon
              ? theme.colors.primaryStrong
              : theme.colors.text
            : inverse
              ? theme.colors.onSecondary
              : theme.colors.text2;
        const icon = (selected && option.selectedIcon) || option.icon;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, selected, disabled }}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
              styles.segment,
              size === 'sm' && styles.small,
              selected && styles.selected,
              abnormal && styles.abnormal,
              pressed && !selected && (inverse ? styles.pressedInverse : styles.pressed),
              focused && focusRing,
            ]}
          >
            {icon ? <Icon name={icon} size={size === 'sm' ? 'xs' : 'sm'} color={color} /> : null}
            <AppText
              variant="label"
              bold={selected}
              center
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.text, { color }]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: theme.spacing.s1,
    gap: theme.spacing.s1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface2,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
  },
  trackInverse: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.s1 + 2,
    minWidth: 0,
    minHeight: theme.control.height - theme.spacing.s2 - 2,
    paddingHorizontal: theme.spacing.s1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  small: { minHeight: theme.control.minTouch - theme.spacing.s2 - 2, paddingHorizontal: theme.spacing.s2 },
  selected: { backgroundColor: theme.colors.surface, ...shadow(1) },
  abnormal: { backgroundColor: theme.colors.abnormal },
  pressed: { backgroundColor: theme.colors.line },
  pressedInverse: { backgroundColor: theme.colors.inkLine },
  text: { flexShrink: 1 },
});

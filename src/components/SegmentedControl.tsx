import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** 'attention' paints the selected segment amber (used for Abnormal). */
  tone?: 'default' | 'attention';
}

interface SegmentedControlProps<T extends string> {
  /** Spoken name of the whole group, e.g. "Species". Announced once for the group. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (next: T) => void;
  disabled?: boolean;
  testID?: string;
}

/** Single-choice segmented control. Exposed to screen readers as one radio group. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [
              styles.segment,
              index > 0 && styles.divider,
              selected && (option.tone === 'attention' ? styles.selectedAttention : styles.selected),
              focused && styles.focused,
            ]}
          >
            <AppText
              bold={selected}
              center
              style={{ color: selected ? theme.colors.surface : theme.colors.text, flexShrink: 1 }}
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
  group: {
    flexDirection: 'row',
    borderRadius: theme.radius.md,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: theme.control.minTouch,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { borderLeftWidth: theme.control.borderWidth, borderLeftColor: theme.colors.border },
  selected: { backgroundColor: theme.colors.text },
  selectedAttention: { backgroundColor: theme.colors.warning },
  focused: {
    borderWidth: theme.control.focusWidth,
    borderColor: theme.colors.focus,
  },
});

import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { focusRing, inputStates, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { BottomSheet } from './BottomSheet';
import { FormField } from './FormField';
import { Icon } from './Icon';
import { inputBaseStyle } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary line, e.g. "Occupied by Yang Yang". */
  description?: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: readonly SelectOption[];
  value: string | null;
  onChange: (next: string) => void;
  error?: string;
  required?: boolean;
  helper?: string;
  /** Shows a spinner instead of the chevron while options load. */
  loading?: boolean;
  /** Message shown inside the sheet when options failed to load. */
  loadError?: string;
  onRetry?: () => void;
  /** Plex Mono value (kennel codes). */
  mono?: boolean;
  disabled?: boolean;
  testID?: string;
}

/**
 * C2 dropdown: closed (chevron down), open (focused edge + halo, chevron up), error, disabled. Options open in a
 * bottom sheet (C8: sheets for pickers on mobile); the selected option is --primary-soft with a check.
 */
export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  required,
  helper,
  loading = false,
  loadError,
  onRetry,
  mono = false,
  disabled = false,
  testID,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FormField label={label} required={required} disabled={disabled} error={error} helper={helper}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected ? selected.label : placeholder}`}
        accessibilityHint="Opens a list of choices"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
          styles.field,
          pressed && styles.pressed,
          disabled && inputStates.disabled,
          error ? inputStates.invalid : focused || open ? inputStates.focused : null,
        ]}
      >
        <AppText variant={selected && mono ? 'mono' : 'body'} style={[styles.value, selected && mono && styles.monoValue]} tone={selected && !disabled ? 'default' : 'subtle'}>
          {selected ? selected.label : placeholder}
        </AppText>
        {loading ? (
          <ActivityIndicator color={theme.colors.text2} />
        ) : (
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" color={disabled ? theme.colors.text3 : open ? theme.colors.primary : theme.colors.text2} />
        )}
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)} testID={testID ? `${testID}-sheet` : undefined}>
        {loadError ? (
          <View style={styles.message}>
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {loadError}
            </AppText>
            {onRetry ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.retry}>
                <AppText bold style={styles.retryText}>
                  Try again
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : options.length === 0 ? (
          <AppText tone="muted" style={styles.message}>
            {loading ? 'Loading…' : 'No options available.'}
          </AppText>
        ) : (
          <FlatList
            data={options}
            keyExtractor={(option) => option.value}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  testID={testID ? `${testID}-option-${item.value}` : undefined}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.description ? `${item.label}. ${item.description}` : item.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                    focused && focusRing,
                  ]}
                >
                  <View style={styles.optionText}>
                    <AppText variant={mono ? 'mono' : 'body'} bold={isSelected} style={mono ? styles.monoValue : undefined}>
                      {item.label}
                    </AppText>
                    {item.description ? (
                      <AppText variant="bodyS" tone="muted">
                        {item.description}
                      </AppText>
                    ) : null}
                  </View>
                  {isSelected ? <Icon name="checkmark" color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </BottomSheet>
    </FormField>
  );
}

const styles = StyleSheet.create({
  field: {
    ...inputBaseStyle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s3,
  },
  value: { flex: 1 },
  pressed: { backgroundColor: theme.colors.surface2 },
  monoValue: { fontSize: theme.text.body.fontSize, lineHeight: theme.text.body.lineHeight },
  option: {
    minHeight: theme.control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s3,
    borderRadius: theme.radius.md,
  },
  optionSelected: { backgroundColor: theme.colors.primarySoft },
  optionPressed: { backgroundColor: theme.colors.surface2 },
  optionText: { flex: 1, gap: theme.spacing.s1 },
  message: { paddingVertical: theme.spacing.s4, gap: theme.spacing.s3 },
  retry: { minHeight: theme.control.minTouch, justifyContent: 'center' },
  retryText: { color: theme.colors.primary },
});

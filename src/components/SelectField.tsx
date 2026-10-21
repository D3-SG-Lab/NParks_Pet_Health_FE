import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
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
  helper?: string;
  /** Shows a spinner instead of the chevron while options load. */
  loading?: boolean;
  /** Message shown inside the sheet when options failed to load. */
  loadError?: string;
  onRetry?: () => void;
  testID?: string;
}

/** Cross-platform dropdown: a field that opens a bottom sheet list (works the same on iOS, Android and web). */
export function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  helper,
  loading = false,
  loadError,
  onRetry,
  testID,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <FormField label={label} error={error} helper={helper}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected ? selected.label : placeholder}`}
        accessibilityHint="Opens a list of choices"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
          styles.field,
          pressed && styles.pressed,
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}
      >
        <AppText style={styles.value} tone={selected ? 'default' : 'muted'}>
          {selected ? selected.label : placeholder}
        </AppText>
        {loading ? (
          <ActivityIndicator color={theme.colors.textMuted} />
        ) : (
          <Icon name="chevron-down" color={theme.colors.textMuted} />
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
                    pressed && styles.optionPressed,
                    focused && styles.focused,
                  ]}
                >
                  <View style={styles.optionText}>
                    <AppText bold={isSelected}>{item.label}</AppText>
                    {item.description ? (
                      <AppText variant="caption" tone="muted">
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
    gap: theme.spacing.md,
  },
  value: { flex: 1 },
  pressed: { opacity: 0.85 },
  focused: { borderColor: theme.colors.focus, borderWidth: theme.control.focusWidth },
  invalid: { borderColor: theme.colors.danger },
  option: {
    minHeight: theme.control.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.divider,
  },
  optionPressed: { backgroundColor: theme.colors.background },
  optionText: { flex: 1, gap: theme.spacing.xs },
  message: { paddingVertical: theme.spacing.lg, gap: theme.spacing.md },
  retry: { minHeight: theme.control.minTouch, justifyContent: 'center' },
  retryText: { color: theme.colors.info },
});

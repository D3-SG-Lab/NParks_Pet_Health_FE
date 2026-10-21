import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { theme } from '@/theme';

import { FormField } from './FormField';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    'placeholder' | 'keyboardType' | 'maxLength' | 'autoCapitalize' | 'autoCorrect' | 'inputMode' | 'onBlur' | 'returnKeyType'
  > {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  optional?: boolean;
  error?: string;
  helper?: string;
  multiline?: boolean;
  /** Control shown beside the input (e.g. a Scan button). */
  accessory?: ReactNode;
  testID?: string;
}

/** Themed text input with label, helper and error text. Grows with font scaling (no fixed height). */
export function TextField({
  label,
  value,
  onChangeText,
  optional,
  error,
  helper,
  multiline = false,
  accessory,
  testID,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FormField label={label} optional={optional} error={error} helper={helper}>
      <View style={styles.row}>
      <TextInput
        {...inputProps}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={optional ? `${label} (optional)` : label}
        accessibilityState={{ disabled: false }}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}
      />
      {accessory}
      </View>
    </FormField>
  );
}

export const inputBaseStyle = {
  minHeight: theme.control.buttonLarge,
  borderRadius: theme.radius.md,
  borderWidth: theme.control.borderWidth,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.surface,
  paddingHorizontal: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  fontSize: theme.fontSizes.body,
  color: theme.colors.text,
} as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  input: { ...inputBaseStyle, flex: 1 },
  multiline: { minHeight: theme.control.textAreaMinHeight },
  focused: { borderColor: theme.colors.focus, borderWidth: theme.control.focusWidth },
  invalid: { borderColor: theme.colors.danger },
});

import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { inputStates, theme, webInputReset } from '@/theme';

import { AppText } from './AppText';
import { FormField } from './FormField';
import { Icon } from './Icon';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'keyboardType'
    | 'maxLength'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'autoComplete'
    | 'inputMode'
    | 'onBlur'
    | 'onFocus'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'secureTextEntry'
    | 'textContentType'
  > {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  required?: boolean;
  optional?: boolean;
  /** Visually hide the label (it is still announced), e.g. inline note inputs. */
  hideLabel?: boolean;
  aside?: ReactNode;
  error?: string;
  helper?: string;
  multiline?: boolean;
  disabled?: boolean;
  /** Shown but not editable (value stays readable). */
  readOnly?: boolean;
  /** Plex Mono value (microchip numbers, IDs). */
  mono?: boolean;
  /** Character counter inside a textarea ("104 / 1000"); needs maxLength. */
  showCount?: boolean;
  /** Unit shown inside the input on the right, e.g. "kg". */
  suffix?: string;
  /** Icon or control inside the input on the right (e.g. a calendar icon). */
  trailingIcon?: ReactNode;
  /** Control shown beside the input (e.g. a Scan or Post button) — C2 "with action". */
  accessory?: ReactNode;
  /** Keep the keyboard open on submit (multi-field forms move on with returnKeyType "next"). */
  submitBehavior?: TextInputProps['submitBehavior'];
  testID?: string;
}

/**
 * C2 text input / textarea with the documented states: default (--line-strong), focused (2 px --primary edge +
 * --primary-tint halo), filled, error (2 px --danger edge + --danger-soft halo, icon + message replacing the
 * helper), disabled (--bg fill, --text-3) and read-only. Grows with font scaling (no fixed height).
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChangeText,
    required,
    optional,
    hideLabel = false,
    aside,
    error,
    helper,
    multiline = false,
    disabled = false,
    readOnly = false,
    mono = false,
    showCount = false,
    suffix,
    trailingIcon,
    accessory,
    testID,
    onBlur,
    onFocus,
    maxLength,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const editable = !disabled && !readOnly;
  const input = (
    <View style={styles.row}>
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          disabled ? inputStates.disabled : readOnly ? inputStates.readOnly : null,
          error ? inputStates.invalid : focused && editable ? inputStates.focused : null,
        ]}
      >
        <View style={styles.inputColumn}>
          <TextInput
            {...inputProps}
            ref={ref}
            testID={testID}
            value={value}
            onChangeText={onChangeText}
            maxLength={maxLength}
            multiline={multiline}
            editable={editable}
            readOnly={readOnly || disabled}
            textAlignVertical={multiline ? 'top' : 'center'}
            accessibilityLabel={optional ? `${label} (optional)` : label}
            accessibilityHint={error}
            accessibilityState={{ disabled }}
            aria-invalid={error ? true : undefined}
            placeholderTextColor={theme.colors.text3}
            selectionColor={theme.colors.primary}
            cursorColor={theme.colors.primary}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[styles.input, mono && styles.mono, multiline && styles.inputMultiline, disabled && styles.disabledText, webInputReset]}
          />
          {showCount && maxLength ? (
            <AppText variant="caption" tone="subtle" style={styles.count} accessibilityLabel={`${value.length} of ${maxLength} characters`}>
              {`${value.length} / ${maxLength}`}
            </AppText>
          ) : null}
        </View>
        {suffix ? (
          <AppText tone={disabled ? 'subtle' : 'muted'} style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
        {trailingIcon ? <View style={styles.suffix}>{trailingIcon}</View> : null}
      </View>
      {accessory}
    </View>
  );
  if (hideLabel) {
    return (
      <View style={styles.bare}>
        {input}
        {error ? (
          <View style={styles.message} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <View style={styles.icon}>
              <Icon name="alert-circle-outline" size="xs" color={theme.colors.danger} />
            </View>
            <AppText variant="bodyS" tone="danger" style={styles.messageText}>
              {error}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <FormField label={label} required={required} optional={optional} disabled={disabled} aside={aside} error={error} helper={helper}>
      {input}
    </FormField>
  );
});

/** Shared box of C2 inputs (text field, dropdown, search, pick fields). */
export const inputBaseStyle = {
  minHeight: theme.control.height,
  borderRadius: theme.radius.lg,
  borderWidth: theme.control.borderWidth,
  borderColor: theme.colors.lineStrong,
  backgroundColor: theme.colors.surface,
  paddingHorizontal: theme.spacing.s4,
} as const;

/** Text style of C2 input values: body 16/24 (prevents iOS zoom). */
export const inputTextStyle: TextStyle = {
  fontFamily: theme.text.body.fontFamily,
  fontSize: theme.text.body.fontSize,
  color: theme.colors.text,
};

const styles = StyleSheet.create({
  bare: { gap: theme.spacing.s2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s2 },
  // minWidth 0: web inputs have an intrinsic width and would otherwise refuse to shrink in a row.
  box: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.control.height,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  multiline: { alignItems: 'flex-start', minHeight: theme.control.textAreaMinHeight },
  inputColumn: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  input: {
    ...inputTextStyle,
    minWidth: 0,
    flex: 1,
    minHeight: theme.control.height - 2,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
  },
  mono: { fontFamily: theme.fonts.mono, letterSpacing: 0.5 },
  inputMultiline: { minHeight: theme.control.textAreaMinHeight - 2 },
  count: { paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s2 },
  suffix: { paddingRight: theme.spacing.s4 },
  disabledText: { color: theme.colors.text3 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s1 + 2 },
  messageText: { flex: 1 },
  icon: { marginTop: 3 },
});

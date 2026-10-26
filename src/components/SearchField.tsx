import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { inputStates, theme, webInputReset } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon } from './Icon';
import { inputBaseStyle, inputTextStyle } from './TextField';

interface SearchFieldProps {
  value: string;
  onChangeText?: (next: string) => void;
  placeholder: string;
  /** Spoken label; defaults to the placeholder. */
  label?: string;
  autoFocus?: boolean;
  /** Render as a button that opens a search screen (Operations home) instead of an input. */
  onPress?: () => void;
  testID?: string;
}

/** Search input with a leading magnifier and a clear button. Results update as you type. */
export function SearchField({ value, onChangeText, placeholder, label, autoFocus, onPress, testID }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="search"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Opens search"
        onPress={onPress}
        style={({ pressed, focused: f }: { pressed: boolean; focused?: boolean }) => [styles.field, pressed && styles.pressed, f && inputStates.focused]}
      >
        <Icon name="search" size="sm" color={theme.colors.text2} />
        <AppText tone="subtle" style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </AppText>
      </Pressable>
    );
  }
  return (
    <View style={[styles.field, focused && inputStates.focused]}>
      <Icon name="search" size="sm" color={focused ? theme.colors.primary : theme.colors.text2} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text3}
        selectionColor={theme.colors.primary}
        cursorColor={theme.colors.primary}
        accessibilityLabel={label ?? placeholder}
        accessibilityRole="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={(event) => {
          // Escape clears the query on web keyboards.
          if (event.nativeEvent.key === 'Escape' && value) onChangeText?.('');
        }}
        style={[styles.input, webInputReset]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={theme.spacing.s3} onPress={() => onChangeText?.('')}>
          <Icon name="close-circle-outline" size="md" color={theme.colors.text2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    ...inputBaseStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
  },
  pressed: { backgroundColor: theme.colors.surface2 },
  placeholder: { flex: 1 },
  input: { ...inputTextStyle, flex: 1, minWidth: 0, minHeight: theme.control.height - 2 },
});
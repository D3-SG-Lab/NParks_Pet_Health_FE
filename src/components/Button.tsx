import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Spoken label; defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Optional leading icon (decorative). */
  icon?: IconName;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  icon,
}: ButtonProps) {
  const inactive = disabled || loading;
  const isPrimary = variant === 'primary';
  const textColor = inactive
    ? theme.colors.disabled
    : isPrimary
      ? theme.colors.onPrimary
      : theme.colors.onSecondary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        inactive && styles.inactive,
        pressed && styles.pressed,
        focused && styles.focused,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={textColor} accessibilityElementsHidden />
        ) : icon ? (
          <Icon name={icon} color={textColor} />
        ) : null}
        <AppText variant="bodyLarge" bold center style={{ color: textColor, flexShrink: 1 }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.control.buttonLarge,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: theme.control.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.primary,
  },
  inactive: {
    backgroundColor: theme.colors.disabledSurface,
    borderColor: theme.colors.disabledSurface,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  focused: {
    borderColor: theme.colors.focus,
    borderWidth: theme.control.focusWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});

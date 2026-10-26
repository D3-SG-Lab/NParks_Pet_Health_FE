import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { focusRing, focusRingDanger, focusRingFilled, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

/**
 * C1 Button. primary: one per screen (Confirm). secondary: outlined (Save draft, Cancel, Correct).
 * tonal: primary-soft fill (Inspect, Camera). danger: filled red for irreversible actions (Close case).
 * dangerOutline: outlined red opener for a destructive flow (Close case… on Case detail).
 * text: inline action without a container (Change).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'dangerOutline' | 'text';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** lg = 52 (sticky footers), md = 44 (in cards). */
  size?: 'md' | 'lg';
  loading?: boolean;
  /** Label while loading, e.g. "Saving"; defaults to `label`. */
  loadingLabel?: string;
  disabled?: boolean;
  /** Spoken label; defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Optional leading icon (decorative). */
  icon?: IconName;
}

interface Colors {
  bg: string;
  border: string;
  text: string;
  pressedBg: string;
  pressedBorder?: string;
}

const COLORS: Record<ButtonVariant, Colors> = {
  primary: { bg: theme.colors.primary, border: theme.colors.primary, text: theme.colors.onPrimary, pressedBg: theme.colors.primaryStrong, pressedBorder: theme.colors.primaryStrong },
  secondary: { bg: theme.colors.surface, border: theme.colors.lineStrong, text: theme.colors.text, pressedBg: theme.colors.surface2 },
  tonal: { bg: theme.colors.primarySoft, border: theme.colors.primarySoft, text: theme.colors.primaryStrong, pressedBg: theme.colors.primaryTint, pressedBorder: theme.colors.primaryTint },
  danger: { bg: theme.colors.danger, border: theme.colors.danger, text: theme.colors.onPrimary, pressedBg: theme.colors.dangerStrong, pressedBorder: theme.colors.dangerStrong },
  dangerOutline: { bg: theme.colors.surface, border: theme.colors.dangerBorder, text: theme.colors.danger, pressedBg: theme.colors.dangerSoft },
  text: { bg: 'transparent', border: 'transparent', text: theme.colors.primary, pressedBg: 'transparent' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  loadingLabel,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  icon,
}: ButtonProps) {
  const inactive = disabled || loading;
  const colors = COLORS[variant];
  const textColor = disabled ? theme.colors.disabled : colors.text;
  const filled = variant === 'primary' || variant === 'danger';
  const focusStyle = variant === 'text' ? styles.focusedText : variant === 'primary' ? focusRingFilled : variant === 'danger' || variant === 'dangerOutline' ? focusRingDanger : focusRing;

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
        size === 'md' && styles.medium,
        variant === 'text' && styles.text,
        { backgroundColor: colors.bg, borderColor: colors.border },
        filled && !disabled && shadow(1),
        pressed && { backgroundColor: colors.pressedBg, borderColor: colors.pressedBorder ?? colors.border },
        disabled && variant !== 'text' && styles.disabled,
        focused && focusStyle,
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color={textColor} accessibilityElementsHidden />
          ) : icon ? (
            <Icon name={icon} size="sm" color={textColor} />
          ) : null}
          <AppText
            variant={size === 'md' ? 'label' : 'titleS'}
            bold={size === 'md'}
            center
            style={[{ color: textColor, flexShrink: 1 }, variant === 'text' && pressed && styles.underline]}
          >
            {loading ? (loadingLabel ?? label) : label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.control.buttonLarge,
    paddingHorizontal: theme.spacing.s5,
    paddingVertical: theme.spacing.s2,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: { minHeight: theme.control.minTouch, paddingHorizontal: theme.spacing.s4 },
  text: { paddingHorizontal: theme.spacing.s2 },
  disabled: { backgroundColor: theme.colors.disabledSurface, borderColor: theme.colors.disabledSurface, shadowOpacity: 0, elevation: 0 },
  focusedText: { borderColor: theme.colors.primaryTint, borderWidth: theme.control.focusWidth },
  underline: { textDecorationLine: 'underline' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.s2 },
});

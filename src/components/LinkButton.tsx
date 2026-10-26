import { StyleSheet } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

interface LinkButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** Spoken label when the visible text needs context, e.g. "Change animal". */
  accessibilityLabel?: string;
  disabled?: boolean;
  /** 'pill' draws an outlined pill ("Dr Lim W. · Change"). */
  shape?: 'text' | 'pill';
  /** Tone of a text link: primary (default) or AI iris. */
  tone?: 'primary' | 'ai';
  testID?: string;
}

/** C1 text button: inline action in --primary ("Change", "Edit", "Add follow-up action"). 44 pt target. */
export function LinkButton({ label, onPress, icon, accessibilityLabel, disabled = false, shape = 'text', tone = 'primary', testID }: LinkButtonProps) {
  const color = disabled ? theme.colors.disabled : shape === 'pill' ? theme.colors.text : tone === 'ai' ? theme.colors.ai : theme.colors.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: theme.spacing.s1, bottom: theme.spacing.s1 }}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.link,
        shape === 'pill' && styles.pill,
        pressed && styles.pressed,
        focused && focusRing,
      ]}
    >
      {icon ? <Icon name={icon} size="sm" color={color} /> : null}
      <AppText variant="label" bold style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
    minHeight: theme.control.minTouch,
    minWidth: theme.control.minTouch,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s1,
    borderRadius: theme.radius.md,
  },
  pill: {
    minHeight: theme.control.minTouch - 4,
    paddingHorizontal: theme.spacing.s3 + 2,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.6 },
});
import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ActionTileProps {
  label: string;
  icon: IconName;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  testID?: string;
}

/** Large quick-action tile (icon above label), e.g. New Arrival. */
export function ActionTile({ label, icon, variant = 'secondary', onPress, testID }: ActionTileProps) {
  const primary = variant === 'primary';
  const color = primary ? theme.colors.onPrimary : theme.colors.onSecondary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.tile,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      <Icon name={icon} size="lg" color={color} />
      <AppText bold center style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: theme.control.buttonLarge + theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.primary },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  focused: { borderColor: theme.colors.focus, borderWidth: theme.control.focusWidth },
});

import { StyleSheet, View } from 'react-native';

import { focusRing, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

interface ActionTileProps {
  label: string;
  /** Second line, e.g. "Register & baseline exam". */
  description?: string;
  icon: IconName;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  testID?: string;
}

/** Quick-action tile (Operations): icon tile top-left, title and description below. */
export function ActionTile({ label, description, icon, variant = 'secondary', onPress, testID }: ActionTileProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.tile,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.pressedPrimary : styles.pressed),
        focused && focusRing,
      ]}
    >
      <View style={[styles.badge, primary ? styles.badgePrimary : styles.badgeSecondary]}>
        <Icon name={icon} size="md" color={primary ? theme.colors.onPrimary : theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText variant="titleS" tone={primary ? 'inverse' : 'default'}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="bodyS" style={{ color: primary ? theme.colors.primaryTint : theme.colors.text2 }}>
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 148,
    justifyContent: 'space-between',
    gap: theme.spacing.s3,
    padding: theme.spacing.s4,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    ...shadow(1),
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
  badge: { width: theme.control.iconBadge + 8, height: theme.control.iconBadge + 8, borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center' },
  badgePrimary: { backgroundColor: theme.colors.inkLine },
  badgeSecondary: { backgroundColor: theme.colors.primarySoft },
  text: { gap: 2 },
  pressed: { backgroundColor: theme.colors.primarySoft },
  pressedPrimary: { backgroundColor: theme.colors.primaryStrong, borderColor: theme.colors.primaryStrong },
});

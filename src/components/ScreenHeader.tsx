import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ScreenHeaderProps {
  title: string;
  /** Small line above the title (e.g. the greeting). */
  eyebrow?: string;
  /** Shows a leading back/close control. */
  onBack?: () => void;
  backIcon?: IconName;
  backLabel?: string;
  /** Trailing content such as "Step 1 of 2" or icon buttons. */
  trailing?: ReactNode;
  /** Rendered flush under the header row (e.g. a progress bar). */
  below?: ReactNode;
}

/** Page header with optional back control, eyebrow text and trailing slot. */
export function ScreenHeader({
  title,
  eyebrow,
  onBack,
  backIcon = 'arrow-back',
  backLabel = 'Go back',
  trailing,
  below,
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            testID="header-back"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            hitSlop={theme.spacing.sm}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.iconButton, focused && styles.focused]}
          >
            <Icon name={backIcon} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          {eyebrow ? (
            <AppText variant="caption" tone="muted">
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="bodyLarge" bold accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {below}
    </View>
  );
}

interface HeaderIconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Small count badge on the icon. */
  badge?: number;
  testID?: string;
}

/** Icon-only header action with a 44 pt target. */
export function HeaderIconButton({ icon, label, onPress, badge, testID }: HeaderIconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.iconButton, focused && styles.focused]}
    >
      <Icon name={icon} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.control.buttonLarge,
  },
  titles: { flex: 1 },
  title: { fontSize: theme.fontSizes.title },
  trailing: { flexShrink: 0, flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    minWidth: theme.control.minTouch,
    minHeight: theme.control.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  focused: { borderWidth: theme.control.focusWidth, borderColor: theme.colors.focus },
  badge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: theme.spacing.md,
    height: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.surface,
  },
});

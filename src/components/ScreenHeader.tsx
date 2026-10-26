import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

interface ScreenHeaderProps {
  title: string;
  /** Root app bar: small line above the title (e.g. "Wed 21 Oct · AM session"). */
  eyebrow?: string;
  eyebrowIcon?: IconName;
  /** Root app bar (tab roots): display title. Otherwise the 56 task app bar with a title-m title. */
  large?: boolean;
  /** Shows a leading back/close control. */
  onBack?: () => void;
  backIcon?: IconName;
  backLabel?: string;
  /** Trailing content such as "Draft saved", a count badge or icon buttons. */
  trailing?: ReactNode;
  /** Rendered under the header row inside the header surface (step progress, segmented control, search). */
  below?: ReactNode;
  /** Hide the bottom hairline (when the content directly continues the header). */
  flush?: boolean;
}

/** C5 app bar: root (eyebrow + display title) or task (back + title, optional step + progress below). */
export function ScreenHeader({
  title,
  eyebrow,
  eyebrowIcon,
  large = false,
  onBack,
  backIcon = 'chevron-back',
  backLabel = 'Go back',
  trailing,
  below,
  flush = false,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.wrapper, flush && styles.flush]}>
      <View style={[styles.row, large && styles.rowLarge]}>
        {onBack ? (
          <Pressable
            testID="header-back"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            hitSlop={theme.spacing.s1}
            style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
              styles.iconButton,
              styles.back,
              pressed && styles.pressed,
              focused && focusRing,
            ]}
          >
            <Icon name={backIcon} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          {eyebrow ? (
            <View style={styles.eyebrow}>
              {eyebrowIcon ? <Icon name={eyebrowIcon} size="xs" color={theme.colors.primary} /> : null}
              <AppText variant="label" tone="primary">
                {eyebrow}
              </AppText>
            </View>
          ) : null}
          <AppText variant={large ? 'display' : 'titleM'} accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {below ? <View style={styles.below}>{below}</View> : null}
    </View>
  );
}

interface HeaderIconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Shows a dot (unread / new). */
  badge?: number;
  /** Outlined 44 circle (root app bar) or bare icon (task app bar actions such as Edit, Export). */
  outlined?: boolean;
  testID?: string;
}

/** Icon-only action with a 44 pt target, optionally with an unread dot (C1 "icon button 44 with dot"). */
export function HeaderIconButton({ icon, label, onPress, badge, outlined = true, testID }: HeaderIconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.iconButton,
        outlined && styles.outlined,
        pressed && styles.pressed,
        focused && focusRing,
      ]}
    >
      <Icon name={icon} color={theme.colors.text} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  flush: { borderBottomWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s4,
    minHeight: theme.control.appBar,
  },
  rowLarge: { paddingTop: theme.spacing.s3, paddingBottom: theme.spacing.s2 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 + 2 },
  trailing: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  below: { paddingHorizontal: theme.spacing.s4, paddingBottom: theme.spacing.s3, gap: theme.spacing.s3 },
  iconButton: {
    width: theme.control.minTouch,
    height: theme.control.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    borderColor: 'transparent',
  },
  back: { marginLeft: -theme.spacing.s3 },
  outlined: { borderColor: theme.colors.line, backgroundColor: theme.colors.surface },
  pressed: { backgroundColor: theme.colors.surface2 },
  badge: {
    position: 'absolute',
    top: theme.spacing.s2,
    right: theme.spacing.s2,
    width: theme.control.dot + 2,
    height: theme.control.dot + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
    borderWidth: theme.control.focusWidth,
    borderColor: theme.colors.surface,
  },
});

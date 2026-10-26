import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';

export type BannerKind = 'error' | 'warning' | 'info' | 'success' | 'ai';

const KINDS: Record<BannerKind, { icon: IconName; bg: string; border: string; text: string }> = {
  error: { icon: 'alert-circle-outline', bg: theme.colors.dangerSoft, border: theme.colors.dangerBorder, text: theme.colors.danger },
  warning: { icon: 'warning-outline', bg: theme.colors.warningSoft, border: theme.colors.warningBorder, text: theme.colors.warning },
  info: { icon: 'information-circle-outline', bg: theme.colors.infoSoft, border: theme.colors.infoBorder, text: theme.colors.info },
  success: { icon: 'checkmark-circle-outline', bg: theme.colors.successSoft, border: theme.colors.successBorder, text: theme.colors.success },
  ai: { icon: 'sparkles-outline', bg: theme.colors.aiSoft, border: theme.colors.aiBorder, text: theme.colors.ai },
};

interface BannerProps {
  kind: BannerKind;
  title?: string;
  message: string;
  /** Overrides the kind's icon (e.g. the wifi icon of the offline banner). */
  icon?: IconName;
  /** Icon on a white tile (attention banners such as "3 observations need review"). */
  iconTile?: boolean;
  /** Makes the whole banner a button with a trailing chevron. */
  onPress?: () => void;
  accessibilityHint?: string;
  /** Optional control under the message (e.g. "Retry"). */
  action?: ReactNode;
  testID?: string;
}

/**
 * C7 banner: persists while the condition lasts (offline, error, info). Errors are announced
 * assertively by screen readers.
 */
export function Banner({ kind, title, message, icon, iconTile = false, onPress, accessibilityHint, action, testID }: BannerProps) {
  const k = KINDS[kind];
  const label = title ? `${title}. ${message}` : message;
  const content = (
    <>
      {iconTile ? (
        <View style={styles.tile}>
          <Icon name={icon ?? k.icon} size="sm" color={k.text} />
        </View>
      ) : (
        <View style={styles.icon}>
          <Icon name={icon ?? k.icon} size="sm" color={k.text} />
        </View>
      )}
      <View style={styles.body}>
        {title ? (
          <AppText variant="titleS" style={{ color: k.text }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant={title ? 'bodyS' : 'label'} style={{ color: k.text }}>
          {message}
        </AppText>
        {action}
      </View>
      {onPress ? <Icon name="chevron-forward" size="sm" color={k.text} /> : null}
    </>
  );
  // C7 banners are fill-only; the attention variant with an icon tile keeps its edge (screen 2).
  const style = [styles.base, { backgroundColor: k.bg, borderColor: iconTile ? k.border : k.bg }, iconTile && styles.roomy];
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [...style, pressed && styles.pressed, focused && focusRing]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View
      testID={testID}
      accessible={!action}
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}
      accessibilityLabel={label}
      style={style}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.control.borderWidth,
    paddingHorizontal: theme.spacing.s4,
    paddingVertical: theme.spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
  },
  roomy: { paddingVertical: theme.spacing.s3 + 2, paddingHorizontal: theme.spacing.s3 + 2 },
  icon: { alignSelf: 'flex-start', paddingTop: 1 },
  tile: {
    width: theme.control.iconBadge,
    height: theme.control.iconBadge,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  body: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});

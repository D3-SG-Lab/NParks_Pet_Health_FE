import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

export type BannerKind = 'error' | 'warning' | 'info';

interface BannerProps {
  kind: BannerKind;
  title?: string;
  message: string;
  testID?: string;
}

/** Inline notice. Errors are announced assertively by screen readers. */
export function Banner({ kind, title, message, testID }: BannerProps) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}
      accessibilityLabel={title ? `${title}. ${message}` : message}
      style={[styles.base, kind === 'error' ? styles.error : kind === 'warning' ? styles.warning : styles.info]}
    >
      {title ? (
        <AppText bold tone={kind === 'error' ? 'danger' : 'default'}>
          {title}
        </AppText>
      ) : null}
      <AppText variant="caption" tone={kind === 'error' ? 'danger' : 'default'}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderWidth: theme.control.borderWidth,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  error: { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.danger },
  warning: { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warning },
  info: { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
});

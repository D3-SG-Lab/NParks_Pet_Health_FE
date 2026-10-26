import { Text, type TextProps, type TextStyle } from 'react-native';

import { theme } from '@/theme';

/** The design-system type scale (IBM Plex Sans + Plex Mono). */
export type TextVariant = keyof typeof theme.text;
export type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'inverse'
  | 'ai'
  | 'success'
  | 'warning'
  | 'abnormal'
  | 'danger'
  | 'info';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Semibold (600) — for emphasis inside body, meta or mono text. */
  bold?: boolean;
  center?: boolean;
}

const colorFor: Record<TextTone, string> = {
  default: theme.colors.text,
  muted: theme.colors.text2,
  subtle: theme.colors.text3,
  primary: theme.colors.primary,
  inverse: theme.colors.inverse,
  ai: theme.colors.ai,
  success: theme.colors.success,
  warning: theme.colors.warning,
  abnormal: theme.colors.abnormal,
  danger: theme.colors.danger,
  info: theme.colors.info,
};

const boldFamily = (variant: TextVariant) => (variant === 'mono' ? theme.fonts.monoSemibold : theme.fonts.sansSemibold);

/**
 * Themed text. Weight comes from the font family (custom fonts ignore fontWeight on Android), so emphasis
 * uses `bold` rather than a fontWeight style. Font scaling stays enabled and no fixed heights are applied,
 * so large accessibility sizes wrap instead of clipping.
 */
export function AppText({ variant = 'body', tone = 'default', bold = false, center = false, style, ...rest }: AppTextProps) {
  const spec = theme.text[variant];
  const base: TextStyle = {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    fontFamily: bold ? boldFamily(variant) : spec.fontFamily,
    letterSpacing: spec.letterSpacing,
    color: colorFor[tone],
    textAlign: center ? 'center' : 'auto',
    ...(variant === 'overline' ? { textTransform: 'uppercase' } : null),
  };
  return <Text {...rest} style={[base, style]} />;
}

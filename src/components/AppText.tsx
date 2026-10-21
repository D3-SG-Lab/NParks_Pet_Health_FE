import { Text, type TextProps, type TextStyle } from 'react-native';

import { theme } from '@/theme';

export type TextVariant = 'headline' | 'title' | 'bodyLarge' | 'body' | 'caption';
export type TextTone = 'default' | 'muted' | 'danger';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  bold?: boolean;
  center?: boolean;
}

const sizeFor: Record<TextVariant, number> = {
  headline: theme.fontSizes.headline,
  title: theme.fontSizes.title,
  bodyLarge: theme.fontSizes.bodyLarge,
  body: theme.fontSizes.body,
  caption: theme.fontSizes.caption,
};

const colorFor: Record<TextTone, string> = {
  default: theme.colors.text,
  muted: theme.colors.textMuted,
  danger: theme.colors.danger,
};

/** Themed text. Font scaling stays enabled (default) and no fixed heights are applied. */
export function AppText({
  variant = 'body',
  tone = 'default',
  bold = false,
  center = false,
  style,
  ...rest
}: AppTextProps) {
  const base: TextStyle = {
    fontSize: sizeFor[variant],
    color: colorFor[tone],
    fontWeight: bold || variant === 'headline' || variant === 'title' ? theme.fontWeights.bold : theme.fontWeights.regular,
    textAlign: center ? 'center' : 'auto',
  };
  return <Text {...rest} style={[base, style]} />;
}

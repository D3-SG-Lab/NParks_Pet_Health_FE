import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { shadow, theme } from '@/theme';

export type CardTone = 'default' | 'muted' | 'ai' | 'info' | 'warning' | 'abnormal' | 'danger' | 'success';

interface CardProps {
  children: ReactNode;
  /**
   * C6 card surfaces: default white (shadow-1), muted surface-2 panel, ai = iris-tinted AI content
   * (always cites its sources), and the soft status fills.
   */
  tone?: CardTone;
  /** Adds shadow-1 (default true for plain cards). */
  elevated?: boolean;
  /** Highlight border: the selected routing card (primary), an overdue dose (danger), a due tile (warning). */
  outline?: 'primary' | 'warning' | 'danger';
  /** Padding 16 (default) or none, for cards made of full-bleed rows. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<CardTone, { bg: string; border: string }> = {
  default: { bg: theme.colors.surface, border: theme.colors.line },
  muted: { bg: theme.colors.surface2, border: theme.colors.surface2 },
  ai: { bg: theme.colors.aiSoft, border: theme.colors.aiBorder },
  info: { bg: theme.colors.infoSoft, border: theme.colors.infoBorder },
  warning: { bg: theme.colors.warningSoft, border: theme.colors.warningBorder },
  abnormal: { bg: theme.colors.abnormalSoft, border: theme.colors.abnormalBorder },
  danger: { bg: theme.colors.dangerSoft, border: theme.colors.dangerBorder },
  success: { bg: theme.colors.successSoft, border: theme.colors.successBorder },
};

const OUTLINES = {
  primary: theme.colors.primary,
  warning: theme.colors.warning,
  danger: theme.colors.dangerBorder,
} as const;

export function Card({ children, tone = 'default', elevated, outline, padded = true, style, testID }: CardProps) {
  const colors = TONES[tone];
  const raised = elevated ?? tone === 'default';
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        !padded && styles.flush,
        { backgroundColor: colors.bg, borderColor: colors.border },
        raised && shadow(1),
        outline && { borderColor: OUTLINES[outline], borderWidth: outline === 'primary' ? 1.5 : theme.control.borderWidth },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  flush: { padding: 0, gap: 0, overflow: 'hidden' },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { focusRing, shadow, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { KennelCode } from './KennelCode';

interface ListRowProps {
  title: string;
  /** Kennel code shown in mono before the title (C6: avatar + mono kennel code + name). */
  code?: string;
  /** Highlight part of the kennel code (search query). */
  codeHighlight?: string;
  /** Line under the title in body text (e.g. the case finding). */
  body?: string;
  /** Meta line (body-s, text-2), or a node for mixed styling. */
  subtitle?: ReactNode;
  /** Leading element, usually an Avatar. */
  leading?: ReactNode;
  /** Right-aligned next to the title, usually a StatusChip. */
  trailing?: ReactNode;
  /**
   * card: its own rounded card. flat: full-width row with a hairline divider (lists, rows inside a card).
   */
  variant?: 'card' | 'flat';
  /** Hairline under a flat row (default true; off for the last row in a card). */
  divider?: boolean;
  /** Mute the row (closed records). */
  muted?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** C6 list row: the whole row is a single button; status sits right-aligned. */
export function ListRow({
  title,
  code,
  codeHighlight,
  body,
  subtitle,
  leading,
  trailing,
  variant = 'card',
  divider = true,
  muted = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListRowProps) {
  const spokenSubtitle = typeof subtitle === 'string' ? subtitle : undefined;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [code ? `${code} ${title}` : title, body, spokenSubtitle].filter(Boolean).join('. ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.row,
        variant === 'card' ? styles.card : styles.flat,
        variant === 'flat' && !divider && styles.noDivider,
        pressed && styles.pressed,
        focused && focusRing,
      ]}
    >
      {leading}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <View style={styles.identity}>
            {code ? <KennelCode code={code} highlight={codeHighlight} /> : null}
            <AppText variant="titleS" tone={muted ? 'muted' : 'default'} style={styles.title}>
              {title}
            </AppText>
          </View>
          {trailing}
        </View>
        {body ? <AppText tone={muted ? 'muted' : 'default'}>{body}</AppText> : null}
        {typeof subtitle === 'string' ? (
          <AppText variant="bodyS" tone="muted">
            {subtitle}
          </AppText>
        ) : (
          subtitle
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s3, minHeight: theme.control.minTouch },
  card: {
    padding: theme.spacing.s4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    ...shadow(1),
  },
  flat: {
    paddingVertical: theme.spacing.s4,
    paddingHorizontal: theme.spacing.s4,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.control.borderWidth,
    borderBottomColor: theme.colors.line,
  },
  noDivider: { borderBottomWidth: 0 },
  pressed: { backgroundColor: theme.colors.primarySoft },
  text: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.s2 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: theme.spacing.s2, rowGap: 2 },
  title: { flexShrink: 1 },
});

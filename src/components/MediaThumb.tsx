import type { ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { focusRing, theme } from '@/theme';

import { AppText } from './AppText';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

interface MediaThumbProps {
  kind: 'photo' | 'video';
  /** Video length in seconds. */
  durationSec?: number;
  /** "+3" overlay for the last tile of a truncated gallery. */
  moreCount?: number;
  /** Fixed size, or 'fill' to take the width of its grid cell (square). */
  size?: 'sm' | 'md' | 'fill';
  /** Highlighted (selected in the evidence viewer strip). */
  selected?: boolean;
  /** Dark style for the evidence viewer. */
  dark?: boolean;
  /** Content drawn over the tile (upload status). */
  overlay?: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/**
 * Evidence tile (C7 upload tile): photos on --surface-2, videos on the navy --secondary tile with a play icon
 * and their length. Real thumbnails come from short-lived read URLs later (FE-024).
 */
export function MediaThumb({
  kind,
  durationSec,
  moreCount,
  size = 'md',
  selected = false,
  dark = false,
  overlay,
  onPress,
  accessibilityLabel,
  testID,
}: MediaThumbProps) {
  const dimension: DimensionValue = size === 'fill' ? '100%' : size === 'sm' ? 56 : theme.control.thumb;
  const video = kind === 'video';
  const iconColor = video || dark ? theme.colors.inverse : theme.colors.text3;
  const inner = (
    <>
      {moreCount ? (
        <AppText variant="titleS" style={{ color: iconColor }}>{`+${moreCount}`}</AppText>
      ) : (
        <Icon name={video ? 'play' : 'image-outline'} size={size === 'sm' ? 'sm' : 'md'} color={iconColor} />
      )}
      {video && durationSec && size !== 'sm' && !moreCount ? (
        <AppText variant="mono" style={styles.duration}>
          {formatDuration(durationSec)}
        </AppText>
      ) : null}
      {overlay}
    </>
  );
  const style = [
    styles.tile,
    { width: dimension, aspectRatio: 1 },
    size === 'sm' && styles.small,
    video && styles.video,
    dark && (video ? styles.darkVideo : styles.dark),
    selected && styles.selected,
  ];
  if (!onPress) {
    return (
      <View testID={testID} style={style} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        {inner}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [...style, pressed && styles.pressed, focused && focusRing]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface2,
    borderWidth: theme.control.borderWidth,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  small: { borderRadius: theme.radius.md },
  video: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  dark: { backgroundColor: theme.colors.inkSurface, borderColor: theme.colors.inkLine },
  darkVideo: { borderColor: theme.colors.inkLine },
  duration: { position: 'absolute', right: theme.spacing.s2, bottom: theme.spacing.s1, fontSize: theme.text.overline.fontSize, color: theme.colors.inverse },
  selected: { borderWidth: theme.control.focusWidth, borderColor: theme.colors.inverse },
  pressed: { opacity: 0.8 },
});

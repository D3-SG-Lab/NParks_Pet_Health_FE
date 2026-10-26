import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { focusRing, shadow, theme } from '@/theme';

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 20;
const INSET = (TRACK_H - THUMB) / 2;
const TRAVEL = TRACK_W - THUMB - INSET * 2;

interface SwitchProps {
  value: boolean;
  disabled?: boolean;
  /** Keyboard focus on the owning row: draws the C1 focus halo on the track. */
  focused?: boolean;
}

/**
 * Token-styled on/off switch (visual only — the owning row is the accessible control). Neither PDF draws a
 * switch, so it uses the C3 selection tokens: ON = --primary track, OFF = --line-strong track, white thumb with
 * shadow-1; disabled = --line track; focus = --primary edge + --primary-tint halo (C1/C2). Identical on iOS,
 * Android and web (the platform Switch paints its own colours, e.g. a non-token teal thumb on web).
 */
export function Switch({ value, disabled = false, focused = false }: SwitchProps) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(position, { toValue: value ? 1 : 0, duration: theme.motion.fast, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [position, value]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] });
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, value ? styles.on : styles.off, disabled && (value ? styles.disabledOn : styles.disabledOff), focused && styles.focused]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    padding: INSET - theme.control.borderWidth,
    borderRadius: theme.radius.pill,
    borderWidth: theme.control.borderWidth,
    justifyContent: 'center',
  },
  on: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  off: { backgroundColor: theme.colors.lineStrong, borderColor: theme.colors.lineStrong },
  disabledOn: { backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primaryTint },
  disabledOff: { backgroundColor: theme.colors.line, borderColor: theme.colors.line },
  focused: { ...focusRing, outlineOffset: 2 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    ...shadow(1),
  },
});

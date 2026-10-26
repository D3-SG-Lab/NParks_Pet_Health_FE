import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { tokens } from './tokens';

export const theme = tokens;
export type Theme = typeof tokens;
export { tokens };

export type Elevation = keyof typeof tokens.elevation;

const halo = (color: string, offset = 0): ViewStyle => ({
  outlineColor: color,
  outlineStyle: 'solid',
  outlineWidth: tokens.control.focusHalo,
  outlineOffset: offset,
});

/** C1 focus on outlined / tonal controls: a --primary edge plus a --primary-tint halo. */
export const focusRing: ViewStyle = {
  borderColor: tokens.colors.primary,
  ...halo(tokens.colors.primaryTint),
};

/** C1 focus on filled buttons: the fill stays, a halo sits 2 px outside it. */
export const focusRingFilled: ViewStyle = halo(tokens.colors.primaryHalo, 2);
export const focusRingDanger: ViewStyle = halo(tokens.colors.dangerHalo, 2);

/**
 * C2 input states. Focused and invalid inputs get a 2 px edge (the extra pixel is taken from the margin so
 * the text does not move) and a halo: --primary-tint when focused, --danger-soft when invalid.
 */
const activeEdge = (color: string, haloColor: string): ViewStyle => ({
  borderColor: color,
  borderWidth: tokens.control.inputBorderActive,
  margin: tokens.control.borderWidth - tokens.control.inputBorderActive,
  ...halo(haloColor),
});

export const inputStates = {
  focused: activeEdge(tokens.colors.primary, tokens.colors.primaryTint),
  invalid: activeEdge(tokens.colors.danger, tokens.colors.dangerSoft),
  /** Disabled: --bg fill, --line edge (text in --text-3). */
  disabled: { backgroundColor: tokens.colors.background, borderColor: tokens.colors.line } satisfies ViewStyle,
  /** Read-only: same container as disabled, value stays --text. */
  readOnly: { backgroundColor: tokens.colors.background, borderColor: tokens.colors.line } satisfies ViewStyle,
} as const;

/**
 * Removes the browser's own focus outline from native <input>/<textarea> on web: the surrounding field box
 * draws the design-system focus state instead.
 */
// 'none' is valid CSS for React Native Web but missing from the native style types.
export const webInputReset: TextStyle = Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

/** Same reset for a pressable row that draws its focus ring on an inner part (switch track, checkbox box). */
export const webFocusReset: ViewStyle = webInputReset as ViewStyle;

/** Cross-platform shadow style for shadow-1 (cards, rows), shadow-2 (menus, toasts) or shadow-3 (dialogs, sheets). */
export function shadow(level: Elevation): ViewStyle {
  const e = tokens.elevation[level];
  return {
    shadowColor: tokens.colors.shadow,
    shadowOpacity: e.shadowOpacity,
    shadowRadius: e.shadowRadius,
    shadowOffset: { width: 0, height: e.shadowOffsetY },
    elevation: e.elevation,
  };
}

/**
 * Design tokens (FE-002) — "AQC Clinical", AQC Animal Health design system v1.0 (docs/Product_Design.pdf,
 * page "Foundations · tokens"). Names follow the design system: --primary, --primary-soft, --line, --text-2 …
 * Clinical teal signals biosecurity and care, deep navy carries selection, iris is reserved for AI-generated
 * content. Screens only import from the theme; never hard-code a colour, size or font.
 */
const palette = {
  /** Brand. */
  primary50: '#E6F2F0',
  primary100: '#CFE7E3',
  primary600: '#0B6E69',
  primary700: '#08564F',
  primary900: '#0A3D3B',
  secondary: '#1E3A4C',
  iris: '#4F4BB8',
  iris50: '#F0EFFC',
  /** Neutrals. */
  bg: '#F4F7F6',
  white: '#FFFFFF',
  surface2: '#EEF3F2',
  line: '#DDE5E4',
  lineStrong: '#B8C6C4',
  text3: '#637075',
  text2: '#4B5A60',
  text: '#142127',
  /** Status: solid (text / icon) + soft (fill). */
  success: '#18794E',
  successSoft: '#E5F4EC',
  warning: '#A15C07',
  warningSoft: '#FDF0DB',
  abnormal: '#B54708',
  abnormalSoft: '#FFF4EC',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  info: '#1F5EA8',
  infoSoft: '#E7EFFA',
};

/** A token colour at reduced opacity (borders of soft status surfaces, scrims). */
function alpha(hex: string, opacity: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

/** Mixes two token colours (pressed shades derived from the palette). */
function mix(hex: string, withHex: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(withHex.slice(1), 16);
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

const fonts = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemibold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const tokens = {
  palette,
  colors: {
    /** --primary: primary buttons, links (6.2:1 on white). */
    primary: palette.primary600,
    /** --primary-strong: pressed, active text. */
    primaryStrong: palette.primary700,
    /** --primary-deep: hero, brand. */
    primaryDeep: palette.primary900,
    /** --primary-soft: selected rows, nav pill, tonal buttons. */
    primarySoft: palette.primary50,
    /** --primary-tint: focus halo, progress track. */
    primaryTint: palette.primary100,
    onPrimary: palette.white,
    /** --secondary: selected chips and segments, video tiles. */
    secondary: palette.secondary,
    onSecondary: palette.white,
    /** --ai / --ai-soft: AI labels and icons, AI summary surface. */
    ai: palette.iris,
    aiSoft: palette.iris50,
    aiBorder: alpha(palette.iris, 0.2),

    /** --bg: app canvas. */
    background: palette.bg,
    /** --surface: cards, sheets, bars. */
    surface: palette.white,
    /** --surface-2: segmented track, context bar. */
    surface2: palette.surface2,
    /** --line: card edges, dividers. */
    line: palette.line,
    /** --line-strong: inputs, secondary buttons. */
    lineStrong: palette.lineStrong,

    /** --text: headings, body (16:1). */
    text: palette.text,
    /** --text-2: meta lines (7:1). */
    text2: palette.text2,
    /** --text-3: helper, placeholder (5:1). */
    text3: palette.text3,
    inverse: palette.white,

    success: palette.success,
    successSoft: palette.successSoft,
    successBorder: alpha(palette.success, 0.3),
    warning: palette.warning,
    warningSoft: palette.warningSoft,
    warningBorder: alpha(palette.warning, 0.3),
    abnormal: palette.abnormal,
    abnormalSoft: palette.abnormalSoft,
    abnormalBorder: alpha(palette.abnormal, 0.35),
    danger: palette.danger,
    dangerSoft: palette.dangerSoft,
    dangerBorder: alpha(palette.danger, 0.3),
    info: palette.info,
    infoSoft: palette.infoSoft,
    infoBorder: alpha(palette.info, 0.25),

    /** Disabled controls: surface-2 fill, text-3 label. */
    disabled: palette.text3,
    disabledSurface: palette.surface2,
    shadow: palette.text,
    /** Dark surfaces: toasts and the evidence viewer. */
    ink: palette.text,
    inkSurface: alpha(palette.white, 0.1),
    inkLine: alpha(palette.white, 0.16),
    onInkMuted: alpha(palette.white, 0.7),
    backdrop: alpha(palette.text, 0.5),
    /** Pressed danger button (C1): --danger darkened toward --text. */
    dangerStrong: mix(palette.danger, palette.text, 0.25),
    /** C1 focus halos around filled buttons. */
    primaryHalo: alpha(palette.primary600, 0.5),
    dangerHalo: alpha(palette.danger, 0.45),
  },
  fonts,
  /** Type scale (size / line height / weight). */
  text: {
    /** 28/34/600 — screen titles on tab roots. */
    display: { fontSize: 28, lineHeight: 34, fontFamily: fonts.sansSemibold, letterSpacing: -0.2 },
    /** 22/28/600 — profile name, dialog title. */
    titleL: { fontSize: 22, lineHeight: 28, fontFamily: fonts.sansSemibold, letterSpacing: 0 },
    /** 18/24/600 — app bar title. */
    titleM: { fontSize: 18, lineHeight: 24, fontFamily: fonts.sansSemibold, letterSpacing: 0 },
    /** 16/22/600 — list row primary, card title. */
    titleS: { fontSize: 16, lineHeight: 22, fontFamily: fonts.sansSemibold, letterSpacing: 0 },
    /** 16/24/400 — inputs, body copy (16 prevents iOS zoom). */
    body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.sans, letterSpacing: 0 },
    /** 14/20/400 — meta, secondary lines. */
    bodyS: { fontSize: 14, lineHeight: 20, fontFamily: fonts.sans, letterSpacing: 0 },
    /** 14/20/500 — field labels, segmented options. */
    label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.sansMedium, letterSpacing: 0 },
    /** 12/16/500 — helper, badges, nav labels. */
    caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.sansMedium, letterSpacing: 0 },
    /** 11/16/600 +8% — section headers (uppercase). */
    overline: { fontSize: 11, lineHeight: 16, fontFamily: fonts.sansSemibold, letterSpacing: 0.88 },
    /** 13/18/500 — kennel codes, chip numbers, IDs. */
    mono: { fontSize: 13, lineHeight: 18, fontFamily: fonts.mono, letterSpacing: 0 },
  },
  /** 4-pt spacing scale: s4 = screen gutter and card padding, s6 = between sections. */
  spacing: {
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s5: 20,
    s6: 24,
    s8: 32,
    s12: 48,
  },
  /** Inputs and buttons lg, cards xl, sheets `sheet` (top corners), chips and badges pill. */
  radius: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    sheet: 24,
    pill: 999,
  },
  control: {
    /** Minimum touch target and Medium button (in cards), 44. */
    minTouch: 44,
    /** Inputs, dropdowns and segmented tracks. */
    height: 52,
    /** Large button (sticky footers), 52. */
    buttonLarge: 52,
    /** App bar, 56. */
    appBar: 56,
    /** Status badge, 24. */
    badge: 24,
    logo: 96,
    borderWidth: 1,
    focusWidth: 2,
    /** Focus halo around a focused control (--primary-tint). */
    focusHalo: 3,
    /** Border of a focused or invalid input (C2). */
    inputBorderActive: 2,
    contentMaxWidth: 480,
    contentMaxWidthWide: 960,
    iconXs: 14,
    iconSm: 18,
    iconMd: 22,
    iconLg: 28,
    iconBadge: 40,
    tabBarMinHeight: 64,
    avatar: 44,
    avatarLarge: 88,
    thumb: 72,
    progressHeight: 6,
    sheetMaxHeightRatio: 0.85,
    textAreaMinHeight: 104,
    formMaxWidth: 560,
    dot: 8,
  },
  /** shadow-1 cards and rows · shadow-2 menus and toasts · shadow-3 dialogs and sheets. */
  elevation: {
    1: { shadowOpacity: 0.06, shadowRadius: 6, shadowOffsetY: 1, elevation: 1 },
    2: { shadowOpacity: 0.1, shadowRadius: 16, shadowOffsetY: 4, elevation: 4 },
    3: { shadowOpacity: 0.16, shadowRadius: 32, shadowOffsetY: 12, elevation: 8 },
  },
  motion: {
    fast: 120,
    base: 220,
    slow: 900,
  },
  breakpoints: {
    /** Below this, layouts compact (e.g. 2-column grids, wrapped chips). */
    compact: 360,
    tablet: 768,
    desktop: 1200,
  },
} as const;

export type Tokens = typeof tokens;

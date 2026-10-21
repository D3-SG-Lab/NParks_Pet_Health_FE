/**
 * Design tokens.
 *
 * PROVISIONAL: docs/wireframes/design-tokens.json was not present in the repository when this was
 * written, so these values are placeholders with the same categories requested in FE-002
 * (colours, type sizes, spacing, radius, control sizes). Replace them with the real tokens
 * (ideally via a generator script) once the file exists. Screens only ever import from the theme,
 * so swapping values here needs no screen changes. Text/background pairs below meet WCAG AA.
 */
export const tokens = {
  colors: {
    primary: '#1B6B3A',
    onPrimary: '#FFFFFF',
    secondary: '#FFFFFF',
    onSecondary: '#1B6B3A',
    background: '#F4F7F5',
    surface: '#FFFFFF',
    border: '#8A9A90',
    divider: '#DCE3DE',
    text: '#17211B',
    textMuted: '#4A5750',
    danger: '#B3261E',
    dangerSurface: '#FDECEA',
    warning: '#7A4B00',
    warningSurface: '#FFF4DB',
    disabled: '#6B7770',
    disabledSurface: '#E4E9E6',
    focus: '#0B57D0',
    logoPlaceholder: '#DCE3DE',
    primarySurface: '#E3F1E8',
    shadow: '#17211B',
    /** Review status (wireframe style guide: blue). Text/background pair meets WCAG AA. */
    info: '#17497F',
    infoSurface: '#E3ECF8',
    /** Dimmed backdrop behind bottom sheets. */
    backdrop: 'rgba(23, 33, 27, 0.45)',
  },
  fontSizes: {
    caption: 13,
    body: 16,
    bodyLarge: 18,
    title: 26,
    headline: 32,
  },
  fontWeights: {
    regular: '400',
    medium: '600',
    bold: '700',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  control: {
    /** Minimum touch target, 44 pt. */
    minTouch: 44,
    /** Large primary action height used on the sign-in screen. */
    buttonLarge: 56,
    logo: 96,
    borderWidth: 1,
    focusWidth: 2,
    contentMaxWidth: 480,
    /** Wider column for placeholder/content screens on tablet and desktop. */
    contentMaxWidthWide: 960,
    iconSm: 18,
    iconMd: 22,
    iconLg: 28,
    iconBadge: 56,
    tabBarMinHeight: 60,
    /** Circular avatar / animal photo placeholder. */
    avatar: 48,
    /** Square evidence thumbnail. */
    thumb: 72,
    progressHeight: 4,
    /** Maximum height of a bottom sheet, as a fraction of the window. */
    sheetMaxHeightRatio: 0.7,
    /** Minimum height of a multi-line text input. */
    textAreaMinHeight: 96,
    /** Narrow content column for form flows on tablet/desktop. */
    formMaxWidth: 560,
  },
  /** Cross-platform elevation (iOS/web shadow + Android elevation). */
  elevation: {
    card: { shadowOpacity: 0.06, shadowRadius: 12, shadowOffsetY: 4, elevation: 2 },
  },
  motion: {
    fast: 120,
    base: 240,
  },
  breakpoints: {
    tablet: 768,
    desktop: 1200,
  },
} as const;

export type Tokens = typeof tokens;

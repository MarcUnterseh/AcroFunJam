/**
 * Design tokens shared by the web (CSS variables) and mobile (StyleSheet) apps.
 * Named by role, never by value. Contrast ratios are documented in docs/design/principes.md.
 */
export const colors = {
  /** Main action: primary button, links. White text on it: 5.2:1. */
  primary: '#C2410C',
  /** Primary on hover. White text on it: 7.3:1. */
  primaryHover: '#9A3412',
  /** Primary while pressed. White text on it: 9.4:1. */
  primaryActive: '#7C2D12',
  /** Text and icons on a primary background. */
  primaryContrast: '#FFFFFF',
  /** Page background. */
  background: '#FFFFFF',
  /** Secondary areas: header, form card. */
  surface: '#F8F9FA',
  /** Hover background of secondary (neutral) controls. */
  surfaceHover: '#F1F3F5',
  /** Main text. 15.4:1 on background. */
  text: '#212529',
  /** Secondary text: help text, e-mail address in the header. 6.1:1 on background, 5.8:1 on surface. */
  textMuted: '#5C636A',
  /** Border of interactive controls (fields, secondary buttons): 3.3:1 on background, 3.2:1 on surface. */
  border: '#868E96',
  /** Decorative separators only (header bottom line, card outline). Not for controls. */
  divider: '#DEE2E6',
  /** Keyboard focus ring, always with an offset on the page background. 6.1:1 on background. */
  focus: '#1864AB',
  /** Errors: text, icon, invalid field border. 5.5:1 on background, 5.1:1 on dangerSurface. */
  danger: '#C92A2A',
  /** Background of the form alert zone. */
  dangerSurface: '#FFF5F5',
  /** Confirmations. 6.1:1 on background, 5.7:1 on successSurface. */
  success: '#237032',
  /** Background of success messages. */
  successSurface: '#EBFBEE',
  /** Neutral information (expired session banner). 6.1:1 on background, 5.5:1 on infoSurface. */
  info: '#1864AB',
  /** Background of information banners. */
  infoSurface: '#E7F5FF',
  /** Background of a disabled control; its text uses textMuted (5.1:1). */
  disabledSurface: '#E9ECEF',
  /**
   * Checked choice (radio tile): 2px border and radio dot. Darker than primary so that it is not mistaken for danger.
   * 7.3:1 on background, 6.9:1 on surface, 6.7:1 on selectedSurface.
   */
  selected: '#9A3412',
  /** Background of a checked choice. text on it: 14.2:1. */
  selectedSurface: '#FFF4E6',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 16 } as const;

export const typography = {
  /** React Native: platform font. */
  fontFamily: 'System',
  /** Web: system font stack, same intent as `fontFamily`. */
  fontFamilyWeb: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  size: { sm: 14, md: 16, lg: 20, xl: 28 },
  weight: { regular: '400', semibold: '600', bold: '700' },
  /** Line height as a ratio of the font size (React Native: multiply by the size). */
  lineHeight: { tight: 1.25, normal: 1.5 },
} as const;

/** Sizes of interactive elements and layout. */
export const sizes = {
  /** Minimum width and height of any touch or click target. */
  touchTarget: 44,
  /** Height of text fields and buttons. */
  control: 48,
  borderWidth: 1,
  /** Border width of an invalid field, so the error does not rely on colour alone. */
  borderWidthStrong: 2,
  /** Left accent bar of alerts and banners. */
  accentBar: 4,
  focusRingWidth: 3,
  focusRingOffset: 2,
  /** Maximum width of a form column. */
  formMaxWidth: 400,
  /** Maximum width of a form column with choice tiles (four tiles on one line). */
  formWideMaxWidth: 640,
  /** Minimum width of a choice tile, so that the longest level name stays on one line next to its radio. */
  tileMinWidth: 152,
  /** Maximum width of the page content. */
  contentMaxWidth: 1040,
  /** Maximum width of the signed-in e-mail address in the header before ellipsis (large screens). */
  accountLabelMaxWidth: 320,
  /** Icon size inside text (alerts, field errors, buttons). */
  icon: 20,
  /** Icon heading a panel (success panel). */
  iconLarge: 32,
  /** Diameter of a dot of the decorative difficulty scale. */
  scaleDot: 8,
} as const;

/** Minimum viewport widths (web media queries, mobile tablets). */
export const breakpoints = { md: 640, lg: 1024 } as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;

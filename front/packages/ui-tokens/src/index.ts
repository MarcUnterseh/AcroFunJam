/**
 * Design tokens shared by the web (CSS variables) and mobile (StyleSheet) apps.
 * Named by role, never by value. Direction « Soleil et Lune » (ADR 0031, docs/design/principes.md): the light theme
 * is the dawn, the dark theme the night. Every contrast quoted here is recomputed by contrast.test.ts.
 */
export const colors = {
  /** Main action: primary button, links (« crépuscule »). White text on it: 7.1:1; 6.4:1 on background. */
  primary: '#5B3FC4',
  /** Primary on hover. White text on it: 9.4:1. */
  primaryHover: '#47309F',
  /** Primary while pressed. White text on it: 11.6:1. */
  primaryActive: '#38267E',
  /** Text and icons on a primary background. */
  primaryContrast: '#FFFFFF',
  /** Page background (« brume »). */
  background: '#F5F2FA',
  /** Cards, form panels. */
  surface: '#FFFFFF',
  /** Hover background of neutral controls, quiet buttons, inner zones of a card. */
  surfaceHover: '#EDE8F7',
  /** Main text (« nuit »). 14.7:1 on background. */
  text: '#211C3B',
  /** Secondary text. 6.3:1 on background, 5.8:1 on surfaceHover. */
  textMuted: '#5B5577',
  /** Border of interactive controls (fields, secondary buttons): 3.06:1 on background. */
  border: '#8F87A8',
  /** Decorative separators only (card outline, rules). Not for controls. */
  divider: '#DCD5EA',
  /** Keyboard focus ring, always with an offset. 5.2:1 on background. */
  focus: '#1D69AE',
  /** Errors: text, icon, invalid field border. */
  danger: '#B42318',
  /** Background of the form alert zone. */
  dangerSurface: '#FDECEA',
  /** Confirmations. */
  success: '#2C6A4C',
  /** Background of success messages. */
  successSurface: '#DCEFE3',
  /** Neutral information (expired session banner). */
  info: '#1D69AE',
  /** Background of information banners. */
  infoSurface: '#DFEAFA',
  /** Background of a disabled control; its text uses textMuted. */
  disabledSurface: '#EDE8F7',
  /** Checked choice of a neutral group (Oui / Non, tag check pills) and « Modifiée » mark: the primary family. */
  selected: '#47309F',
  /** Background of a checked neutral choice. */
  selectedSurface: '#EBE5FB',
  /** Counter badge (number of proposals to validate). Neutral on purpose: a count is not an alarm. */
  badge: '#211C3B',
  /** Text of a counter badge. */
  badgeContrast: '#FFFFFF',
  /** Role « Base » (« terre »): tag, checked difficulty tile. 5.4:1 on baseSurface. */
  base: '#2C6A4C',
  /** Background of the « Base » pill and of a checked base tile. */
  baseSurface: '#DCEFE3',
  /** Role « Flyer » (« ciel »). 4.7:1 on flyerSurface. */
  flyer: '#1D69AE',
  /** Background of the « Flyer » pill and of a checked flyer tile. */
  flyerSurface: '#DFEAFA',
  /** The sun: decorative only (logo, orb, burst). 2.2:1 in the light theme: never text nor an icon carrying meaning. */
  sun: '#E8961E',
  /** Sun icons carrying meaning (flow boundaries, trajectories, spotter note). 4.7:1 on background. */
  sunStrong: '#A15C00',
  /** Background of the safety note (« spotter ») and of the avatar. */
  sunSurface: '#FFEBC4',
  /** Text on the sky of a pose page: at least 4.5:1 over the whole gradient. */
  skyText: '#211C3B',
  /**
   * Background of a tag pill (« pierre », pilule-etiquette.md): a read-only tag of a transition, neutral and warm so
   * that it is told apart from the role pills, the « Modifiée » mark and the quiet buttons. Text on it: 14.1:1,
   * textMuted 6.1:1.
   */
  tagSurface: '#F2EFEA',
  /** Outline of a tag pill: decorative only (the word carries the meaning), never the outline of a control. */
  tagBorder: '#CFC8BD',
} as const;

export type Colors = typeof colors;

/** Dark theme, « la nuit » (the practice of the moon): the same roles, applied under prefers-color-scheme: dark. */
export const colorsDark: { readonly [Role in keyof Colors]: string } = {
  primary: '#B6A6FF',
  primaryHover: '#CDC2FF',
  primaryActive: '#E0D9FF',
  primaryContrast: '#15122B',
  background: '#110F24',
  surface: '#1A1733',
  surfaceHover: '#252148',
  text: '#ECE8F8',
  textMuted: '#ABA4C8',
  border: '#6F6896',
  divider: '#322D57',
  focus: '#8FC1F3',
  danger: '#FF9C8F',
  dangerSurface: '#3A1714',
  success: '#82CDA2',
  successSurface: '#163024',
  info: '#8FC1F3',
  infoSurface: '#13283F',
  disabledSurface: '#252148',
  selected: '#CDC2FF',
  selectedSurface: '#2A2456',
  badge: '#ECE8F8',
  badgeContrast: '#15122B',
  base: '#82CDA2',
  baseSurface: '#163024',
  flyer: '#8FC1F3',
  flyerSurface: '#13283F',
  sun: '#F5C15A',
  sunStrong: '#F5C15A',
  sunSurface: '#3A2E14',
  skyText: '#F3F0FF',
  tagSurface: '#2A2733',
  tagBorder: '#4D4858',
};

/**
 * The sky of the pose page header, its orb (sun at dawn, moon at night) and its grain: CSS values for the web, the
 * only colours written outside the palette. The mobile app may ignore them.
 */
export const sky = {
  gradient: 'linear-gradient(172deg, #FFE1A0 0%, #FBC0A4 36%, #D3C1F1 72%, #A797E6 100%)',
  orb: 'radial-gradient(circle at 50% 50%, #FFF6D8 0%, #FFD36B 38%, #F6A43A 70%, rgba(246, 164, 58, 0) 71%)',
  orbGlow: 'rgba(255, 196, 92, 0.55)',
  grainOpacity: 0.18,
} as const;

export type Sky = typeof sky;

export const skyDark: { readonly [Key in keyof Sky]: Sky[Key] extends number ? number : string } = {
  gradient: 'linear-gradient(172deg, #2E2670 0%, #211C55 45%, #151233 100%)',
  orb: 'radial-gradient(circle at 42% 40%, #FFFDF2 0%, #EDE6CF 45%, #CFC6AC 70%, rgba(207, 198, 172, 0) 71%)',
  orbGlow: 'rgba(220, 214, 255, 0.28)',
  grainOpacity: 0.12,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/**
 * A radius per level of the hierarchy: `sm` small zones inside a card, `md` fields, tiles, transitions, notes,
 * `lg` cards and panels, `pill` buttons, role pills and badges (fully rounded ends whatever the height).
 */
export const radius = { sm: 10, md: 16, lg: 26, pill: 9999 } as const;

export const typography = {
  /** React Native: body text (Figtree, bundled with expo-font, one family per weight). */
  fontFamily: 'Figtree_400Regular',
  /** Web: body text, self-hosted Figtree (@fontsource), then a real system fallback stack. */
  fontFamilyWeb:
    '"Figtree", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Web: titles and pose names, self-hosted Unbounded (@fontsource), then a wide fallback. */
  fontFamilyDisplayWeb: '"Unbounded", "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  /** React Native: the families loaded by expo-font (names of @expo-google-fonts), by role and weight. */
  fontFamilies: {
    body: 'Figtree_400Regular',
    bodySemibold: 'Figtree_600SemiBold',
    bodyBold: 'Figtree_700Bold',
    display: 'Unbounded_600SemiBold',
    displayBold: 'Unbounded_700Bold',
  },
  /** `xs` tags of the role pills; `display` and `displayLarge` the name of a pose under its sky (wide screens). */
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40, display: 64, displayLarge: 96 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  /** Line height as a ratio of the font size (React Native: multiply by the size). */
  lineHeight: { display: 1, tight: 1.25, normal: 1.5 },
  /**
   * React Native: largest multiplier of the system font size, per text level (`maxFontSizeMultiplier`). The text
   * (`xs` to `lg`) follows the system up to ×2; titles (`xl`) up to ×1.25, i.e. 35, still above body text at ×2
   * (32); display text (`xxl` and above: pose names and step numbers read from the mat) is already above body text
   * at ×2 and does not grow, so that a pose name never breaks inside a word on a 360 dp screen. Not used by the web.
   */
  maxFontScale: { text: 2, title: 1.25, display: 1 },
} as const;

/** Sizes of interactive elements and layout. */
export const sizes = {
  /** Minimum width and height of any touch or click target. */
  touchTarget: 44,
  /** Height of text fields and buttons. */
  control: 48,
  borderWidth: 1,
  /** Border width of an invalid field or a checked tile, so that the state does not rely on colour alone. */
  borderWidthStrong: 2,
  /** Left accent bar of alerts and banners. */
  accentBar: 4,
  focusRingWidth: 3,
  focusRingOffset: 2,
  /** Maximum width of a form column. */
  formMaxWidth: 400,
  /** Maximum width of a form column with choice tiles (four tiles on one line). */
  formWideMaxWidth: 640,
  /** Minimum width of a choice tile, so that the longest level name stays on one line. */
  tileMinWidth: 152,
  /** Maximum width of the page content. */
  contentMaxWidth: 1040,
  /** Maximum width of the signed-in e-mail address in the header before ellipsis (large screens). */
  accountLabelMaxWidth: 320,
  /** Icon size inside text (alerts, field errors, buttons). */
  icon: 20,
  /** Icon heading a panel. */
  iconLarge: 32,
  /** A moon phase of the difficulty scale, inside text. */
  moon: 18,
  /** A moon phase in a difficulty tile. */
  moonLarge: 24,
  /** Trajectory of a transition (« de Throne vers Bird »). */
  trajectoryWidth: 46,
  trajectoryHeight: 20,
  /** Minimum height and width of a counter badge (a one-digit badge is a circle). */
  badge: 24,
  /** Slot of the glyph of a pose on its card (drawn later). */
  glyph: 52,
  /** Avatar of the signed-in person in the header. */
  avatar: 36,
  /** Logo in the header. */
  logo: 30,
  /** Orb of the pose page header: narrow, then wide screens. */
  orb: 180,
  orbLarge: 300,
  /** Height of the wavy horizon closing the sky. */
  horizon: 26,
  /** Burst of the success panel. */
  burst: 54,
} as const;

/** Minimum viewport widths (web media queries, mobile tablets). */
export const breakpoints = { md: 640, lg: 1024 } as const;

export type Spacing = typeof spacing;

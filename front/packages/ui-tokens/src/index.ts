/** Design tokens shared by the web (CSS-in-JS / CSS variables) and mobile (StyleSheet) apps. */
export const colors = {
  primary: '#E8590C',
  primaryContrast: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#212529',
  textMuted: '#6C757D',
  danger: '#C92A2A',
  success: '#2B8A3E',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 4, md: 8, lg: 16 } as const;

export const typography = {
  fontFamily: 'System',
  size: { sm: 14, md: 16, lg: 20, xl: 28 },
  weight: { regular: '400', bold: '700' },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;

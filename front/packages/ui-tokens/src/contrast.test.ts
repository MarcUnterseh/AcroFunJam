import { describe, expect, it } from 'vitest';
import { colors, colorsDark, sky, skyDark, type Colors } from './index';

/** Relative luminance of a #RRGGBB colour (WCAG 2.2). */
const luminance = (hex: string): number => {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

export const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

type Role = keyof Colors;

/** Text (4.5:1): the foreground role, then the background role (docs/design/principes.md, « Contrastes »). */
const textPairs: readonly [Role, Role][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceHover'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceHover'],
  ['textMuted', 'disabledSurface'],
  ['textMuted', 'sunSurface'],
  ['primaryContrast', 'primary'],
  ['primaryContrast', 'primaryHover'],
  ['primaryContrast', 'primaryActive'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primaryHover', 'surface'],
  ['base', 'baseSurface'],
  ['flyer', 'flyerSurface'],
  ['surface', 'base'],
  ['surface', 'flyer'],
  ['text', 'baseSurface'],
  ['text', 'flyerSurface'],
  ['text', 'sunSurface'],
  ['text', 'selectedSurface'],
  ['text', 'successSurface'],
  ['text', 'dangerSurface'],
  // Story 8: the pills of the tags of a transition (pilule-etiquette.md).
  ['text', 'tagSurface'],
  ['textMuted', 'tagSurface'],
  ['text', 'infoSurface'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['success', 'successSurface'],
  ['info', 'infoSurface'],
  // Story 9b (Q223): « Revenir au flow précédent », a text button in the message above the bar.
  ['primary', 'infoSurface'],
  ['badgeContrast', 'badge'],
  // Story 10: the text written in the frame of a photo that cannot be previewed (HEIC), on the passe-partout.
  ['text', 'photoMat'],
  ['textMuted', 'photoMat'],
];

/** Controls and icons carrying meaning (3:1). `sun` is decorative in the light theme: never listed here. */
const controlPairs: readonly [Role, Role][] = [
  ['border', 'background'],
  ['border', 'surface'],
  ['focus', 'background'],
  ['focus', 'surface'],
  ['sunStrong', 'background'],
  ['sunStrong', 'surface'],
  ['sunStrong', 'sunSurface'],
  ['selected', 'selectedSurface'],
  ['selected', 'background'],
  ['selected', 'surface'],
  ['base', 'surface'],
  ['flyer', 'surface'],
  ['success', 'successSurface'],
  ['badge', 'surface'],
  // Story 10: the filled part of the progress bar (sending a photo) on its track.
  ['primary', 'surfaceHover'],
  // Story 10: the photo icon of a frame without preview (« aperçu indisponible »), on the passe-partout.
  ['textMuted', 'photoMat'],
];

const hexStops = (gradient: string): string[] => gradient.match(/#[0-9A-Fa-f]{6}/g) ?? [];

describe.each([
  ['light', colors, sky],
  ['dark', colorsDark, skyDark],
] as const)('contrasts of the %s theme', (_, palette, theme) => {
  it.each(textPairs)('should give text %s on %s at least 4.5:1', (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(controlPairs)('should give the control %s on %s at least 3:1', (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
  });

  it('should give the text on the sky at least 4.5:1 over the whole gradient', () => {
    const stops = hexStops(theme.gradient);
    expect(stops.length).toBeGreaterThanOrEqual(3);
    stops.forEach((stop) => expect(contrast(palette.skyText, stop)).toBeGreaterThanOrEqual(4.5));
  });
});

describe('contrast', () => {
  it('should compute the WCAG ratio of two colours', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  it('should tell that the light sun is decorative only (under 3:1 on the background)', () => {
    expect(contrast(colors.sun, colors.background)).toBeLessThan(3);
  });
});

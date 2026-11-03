import { colors, radius, sizes, spacing, typography } from './index.ts';

const kebab = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const px = (value: number): string => `${value}px`;

const declarations = (
  prefix: string,
  values: Readonly<Record<string, string | number>>,
  unit = (v: string | number) => String(v),
) => Object.entries(values).map(([name, value]) => `  --afj-${prefix}-${kebab(name)}: ${unit(value)};`);

/** Font sizes in rem (1rem = 16px by default), so that the text size chosen in the browser is respected. */
const rem = (value: string | number) => `${Number(value) / 16}rem`;

const pixels = (value: string | number) => (typeof value === 'number' ? px(value) : value);

/**
 * The design tokens as CSS custom properties (ADR 0012): `--afj-<group>-<name>`, lengths in pixels.
 * The web site generates a stylesheet from it; its CSS only uses these variables.
 */
export const toCssVariables = (): string =>
  [
    ':root {',
    ...declarations('color', colors),
    ...declarations('spacing', spacing, pixels),
    ...declarations('radius', radius, pixels),
    ...declarations('size', sizes, pixels),
    `  --afj-font-family: ${typography.fontFamilyWeb};`,
    ...declarations('font-size', typography.size, rem),
    ...declarations('font-weight', typography.weight),
    ...declarations('line-height', typography.lineHeight),
    '}',
    '',
  ].join('\n');

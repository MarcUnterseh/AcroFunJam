import { describe, expect, it } from 'vitest';
import { toCssVariables } from './css-variables';

describe('toCssVariables', () => {
  const css = toCssVariables();

  it('should declare the variables on the root element when generated', () => {
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.trimEnd().endsWith('}')).toBe(true);
    expect(css).toContain('  color-scheme: light dark;');
  });

  it('should expose colors with their value when generated', () => {
    expect(css).toContain('--afj-color-primary: #5B3FC4;');
    expect(css).toContain('--afj-color-primary-contrast: #FFFFFF;');
    expect(css).toContain('--afj-color-focus: #1D69AE;');
    expect(css).toContain('--afj-color-base-surface: #DCEFE3;');
    expect(css).toContain('--afj-color-sun-strong: #A15C00;');
  });

  it('should express lengths in pixels when generated', () => {
    expect(css).toContain('--afj-spacing-md: 16px;');
    expect(css).toContain('--afj-radius-md: 16px;');
    expect(css).toContain('--afj-radius-lg: 26px;');
    expect(css).toContain('--afj-size-touch-target: 44px;');
    expect(css).toContain('--afj-spacing-lg: 24px;');
  });

  it('should express font sizes in rem so that the browser text size is respected', () => {
    expect(css).toContain('--afj-font-size-xl: 1.75rem;');
    expect(css).toContain('--afj-font-size-md: 1rem;');
  });

  it('should keep unitless values for weights and line heights when generated', () => {
    expect(css).toContain('--afj-font-weight-bold: 700;');
    expect(css).toContain('--afj-line-height-normal: 1.5;');
  });

  it('should use the self-hosted families with real fallback stacks when generated', () => {
    expect(css).toContain('--afj-font-family: "Figtree", system-ui,');
    expect(css).toContain('--afj-font-family-display: "Unbounded", "Trebuchet MS",');
  });

  it('should expose the sky of the pose page and its orb when generated', () => {
    expect(css).toMatch(/--afj-sky-gradient: linear-gradient\(/);
    expect(css).toMatch(/--afj-sky-orb: radial-gradient\(/);
    expect(css).toContain('--afj-sky-grain-opacity: 0.18;');
  });

  describe('dark theme', () => {
    const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));

    it('should redefine the colors and the sky under prefers-color-scheme: dark', () => {
      expect(css).toContain('@media (prefers-color-scheme: dark) {\n  :root {');
      expect(dark).toContain('--afj-color-background: #110F24;');
      expect(dark).toContain('--afj-color-primary: #B6A6FF;');
      expect(dark).toContain('--afj-color-flyer: #8FC1F3;');
      expect(dark).toContain('--afj-sky-grain-opacity: 0.12;');
    });

    it('should only redefine colors and the sky in the dark theme, not lengths', () => {
      expect(dark).not.toContain('--afj-spacing-');
      expect(dark).not.toContain('--afj-radius-');
    });
  });
});

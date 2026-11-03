import { describe, expect, it } from 'vitest';
import { toCssVariables } from './css-variables';

describe('toCssVariables', () => {
  const css = toCssVariables();

  it('should declare the variables on the root element when generated', () => {
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('should expose colors with their value when generated', () => {
    expect(css).toContain('--afj-color-primary: #C2410C;');
    expect(css).toContain('--afj-color-primary-contrast: #FFFFFF;');
    expect(css).toContain('--afj-color-focus: #1864AB;');
  });

  it('should express lengths in pixels when generated', () => {
    expect(css).toContain('--afj-spacing-md: 16px;');
    expect(css).toContain('--afj-radius-md: 8px;');
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

  it('should use the web font stack when generated', () => {
    expect(css).toContain('--afj-font-family: system-ui,');
  });
});

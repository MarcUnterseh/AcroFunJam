import { describe, expect, it } from 'vitest';
import { isCapability } from './capability';

describe('isCapability', () => {
  it.each(['propose', 'validate-proposals', 'manage-roles'])(
    'should know the capability code "%s"',
    (code) => {
      expect(isCapability(code)).toBe(true);
    },
  );

  it.each(['fly-solo', '', 'Propose'])('should not know the code "%s"', (code) => {
    expect(isCapability(code)).toBe(false);
  });
});

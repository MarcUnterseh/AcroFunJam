import { describe, expect, it } from 'vitest';
import { validatorTextLength } from './validator-text';

describe('validatorTextLength', () => {
  it('should count the characters once the superfluous spaces are removed, in code points', () => {
    expect(validatorTextLength('  Doublon\n\n de 🤸  ')).toBe(12);
  });
});

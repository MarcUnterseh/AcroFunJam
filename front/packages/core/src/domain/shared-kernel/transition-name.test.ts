import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import { checkTransitionName, transitionNamePolicy } from './transition-name';

describe('checkTransitionName', () => {
  it('should give no name for an empty name, or one made only of spaces (a transition without a name)', () => {
    expect(checkTransitionName('')).toEqual(ok(null));
    expect(checkTransitionName('   ')).toEqual(ok(null));
  });

  it('should remove the superfluous spaces, as for the name of a pose', () => {
    expect(checkTransitionName('  Ninja   Star  ')).toEqual(ok('Ninja Star'));
  });

  it('should refuse a name made only of punctuation (Q107)', () => {
    expect(checkTransitionName('---')).toEqual(fail('transition.name-without-letter-or-digit'));
  });

  it('should accept a name of the maximum length, counted once normalised', () => {
    expect(transitionNamePolicy.maxLength).toBe(60);
    expect(checkTransitionName(` ${'x'.repeat(60)} `).ok).toBe(true);
  });

  it('should refuse a name longer than the maximum length', () => {
    expect(checkTransitionName('x'.repeat(61))).toEqual(fail('transition.name-too-long'));
  });
});

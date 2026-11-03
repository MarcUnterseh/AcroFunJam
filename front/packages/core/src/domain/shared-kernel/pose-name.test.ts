import { describe, expect, it } from 'vitest';
import { checkPoseName, normalizePoseName, poseNameLength, poseNamePolicy } from './pose-name';

describe('normalizePoseName', () => {
  it('should remove the spaces at both ends when the name is surrounded by spaces', () => {
    expect(normalizePoseName('  Folded Leaf  ')).toBe('Folded Leaf');
  });

  it('should reduce consecutive inner spaces to one when the name contains several', () => {
    expect(normalizePoseName('High  \t  Bird')).toBe('High Bird');
  });

  it('should keep case, hyphens, parentheses and accents when the name has them', () => {
    expect(normalizePoseName('Hand-to-Hand (L-base) Étoile')).toBe('Hand-to-Hand (L-base) Étoile');
  });

  it('should compose accents (NFC) when the name is typed with combining marks', () => {
    expect(normalizePoseName('Étoile')).toBe('Étoile');
  });
});

describe('poseNameLength', () => {
  it('should count characters after removing the superfluous spaces when the name has some', () => {
    expect(poseNameLength('  High    Bird ')).toBe(9);
  });

  it('should count a decomposed accent as one character when the name is typed with combining marks', () => {
    expect(poseNameLength('Étoile')).toBe(6);
  });

  it('should count code points when the name contains characters outside the basic plane', () => {
    expect(poseNameLength('𝔹ird')).toBe(4);
  });
});

describe('checkPoseName', () => {
  it('should accept the normalised name when the name is valid', () => {
    expect(checkPoseName('  High    Bird ')).toEqual({ ok: true, value: 'High Bird' });
  });

  it.each(['', '   '])('should require a name when the name is "%s"', (raw) => {
    expect(checkPoseName(raw)).toEqual({ ok: false, error: 'pose.name-required' });
  });

  it.each(['---', '( )', '&/+'])(
    'should require a name when the name "%s" has neither letter nor digit',
    (raw) => {
      expect(checkPoseName(raw)).toEqual({ ok: false, error: 'pose.name-required' });
    },
  );

  it('should accept a name of the maximum length when it has 60 characters', () => {
    expect(poseNamePolicy.maxLength).toBe(60);
    expect(checkPoseName('a'.repeat(60)).ok).toBe(true);
  });

  it('should refuse a name longer than the maximum when it has 61 characters', () => {
    expect(checkPoseName('é'.repeat(61))).toEqual({ ok: false, error: 'pose.name-too-long' });
  });

  it('should accept 60 decomposed accents when each one counts as one character', () => {
    expect(checkPoseName('é'.repeat(60)).ok).toBe(true);
  });
});

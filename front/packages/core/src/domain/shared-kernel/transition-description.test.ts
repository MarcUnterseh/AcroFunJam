import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import {
  checkTransitionDescription,
  transitionDescriptionLength,
  transitionDescriptionPolicy,
} from './transition-description';

describe('checkTransitionDescription', () => {
  it('should give no description for an empty one, or one made only of spaces', () => {
    expect(checkTransitionDescription('')).toEqual(ok(null));
    expect(checkTransitionDescription('  \n  ')).toEqual(ok(null));
  });

  it('should remove the spaces at the start and the end only, keeping the line breaks and inner spaces (Q105)', () => {
    expect(checkTransitionDescription('  Passe par Throne,\n  sans  s’arrêter.  ')).toEqual(
      ok('Passe par Throne,\n  sans  s’arrêter.'),
    );
  });

  it('should write every line ending as a line feed, as the API does', () => {
    expect(checkTransitionDescription('Ligne 1\r\nLigne 2')).toEqual(ok('Ligne 1\nLigne 2'));
  });

  it('should accept a description of the maximum length', () => {
    expect(transitionDescriptionPolicy.maxLength).toBe(500);
    expect(checkTransitionDescription('x'.repeat(500)).ok).toBe(true);
  });

  it('should refuse a description longer than the maximum length', () => {
    expect(checkTransitionDescription('x'.repeat(501))).toEqual(fail('transition.description-too-long'));
  });
});

describe('transitionDescriptionLength', () => {
  it('should count the characters once normalised, in code points', () => {
    expect(transitionDescriptionLength('  é́🙂  ')).toBe(3);
  });
});

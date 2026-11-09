import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import { checkRejectionReason } from './rejection-reason';

describe('checkRejectionReason', () => {
  it.each(['', '   ', ' \n\t '])('should require a reason when it is empty or only spaces (%j)', (raw) => {
    expect(checkRejectionReason(raw)).toEqual(fail('contribution.rejection-reason-required'));
  });

  it('should keep the reason without superfluous spaces when it has leading, trailing or repeated spaces', () => {
    expect(checkRejectionReason('  Doublon   de Bird,\n déjà au catalogue. ')).toEqual(
      ok('Doublon de Bird, déjà au catalogue.'),
    );
  });

  it.each([
    ['500 characters', 'x'.repeat(500)],
    ['500 characters once the surrounding spaces are removed', `  ${'x'.repeat(500)}  `],
    ['500 characters outside the basic plane (counted in code points)', '🤸'.repeat(500)],
  ])('should accept a reason of %s', (_case, raw) => {
    expect(checkRejectionReason(raw).ok).toBe(true);
  });

  it('should refuse the reason as too long when it has 501 characters', () => {
    expect(checkRejectionReason('x'.repeat(501))).toEqual(fail('contribution.rejection-reason-too-long'));
  });
});

import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import { checkAdjustmentNote } from './adjustment-note';

describe('checkAdjustmentNote', () => {
  it.each(['', '   ', ' \n '])('should give no note when the message is empty or only spaces (%j)', (raw) => {
    expect(checkAdjustmentNote(raw)).toEqual(ok(null));
  });

  it('should accept a message of 500 characters', () => {
    expect(checkAdjustmentNote('x'.repeat(500)).ok).toBe(true);
  });

  it('should keep the message without superfluous spaces when it has leading, trailing or repeated spaces', () => {
    expect(checkAdjustmentNote(' Throne se découvre\n  dès la première séance. ')).toEqual(
      ok('Throne se découvre dès la première séance.'),
    );
  });

  it('should refuse the message as too long when it has 501 characters', () => {
    expect(checkAdjustmentNote('x'.repeat(501))).toEqual(fail('contribution.adjustment-note-too-long'));
  });
});

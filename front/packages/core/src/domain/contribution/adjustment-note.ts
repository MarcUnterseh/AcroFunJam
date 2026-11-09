import { fail, ok, type Result } from '../common/result';
import { isValidatorTextTooLong, normalizeValidatorText } from './validator-text';

/**
 * The optional message of a validator that accompanies an acceptance with adjustments, and only it
 * (glossary « Message d'ajustement », ADR 0022).
 */
export type AdjustmentNote = string & { readonly __brand: 'AdjustmentNote' };

export type AdjustmentNoteError = 'contribution.adjustment-note-too-long';

/**
 * The normalised message, or null when there is none (a message made only of spaces is no message), or the rule
 * it breaks: same rules and codes as the API, 500 characters at most.
 */
export const checkAdjustmentNote = (raw: string): Result<AdjustmentNote | null, AdjustmentNoteError> => {
  const note = normalizeValidatorText(raw);
  if (isValidatorTextTooLong(note)) return fail('contribution.adjustment-note-too-long');
  return ok(note === '' ? null : (note as AdjustmentNote));
};

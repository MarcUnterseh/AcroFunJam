import { fail, ok, type Result } from '../common/result';
import { isValidatorTextTooLong, normalizeValidatorText } from './proposal-text';

/** Why a validator rejects a proposal, written for its contributor (glossary « Motif de refus », ADR 0022). */
export type RejectionReason = string & { readonly __brand: 'RejectionReason' };

export type RejectionReasonError =
  'contribution.rejection-reason-required' | 'contribution.rejection-reason-too-long';

/** The normalised reason, or the first rule it breaks (same rules and codes as the API): required, 500 at most. */
export const checkRejectionReason = (raw: string): Result<RejectionReason, RejectionReasonError> => {
  const reason = normalizeValidatorText(raw);
  if (reason === '') return fail('contribution.rejection-reason-required');
  if (isValidatorTextTooLong(reason)) return fail('contribution.rejection-reason-too-long');
  return ok(reason as RejectionReason);
};

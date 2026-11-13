import { fail, ok, type Result } from '../common/result';
import { isValidatorTextTooLong, normalizeValidatorText } from './proposal-text';

/**
 * The optional message of a contributor that explains a revision to the validator (glossary « Message de
 * modification », story 6): same normalisation and measure as the other free texts of a proposal (proposal-text, ProposalText of the API).
 */
export type RevisionMessage = string & { readonly __brand: 'RevisionMessage' };

export type RevisionMessageError = 'contribution.revision-message-too-long';

/**
 * The normalised message, or null when there is none (a message made only of spaces is no message), or the rule
 * it breaks: same rules and codes as the API, 500 characters at most.
 */
export const checkRevisionMessage = (raw: string): Result<RevisionMessage | null, RevisionMessageError> => {
  const message = normalizeValidatorText(raw);
  if (isValidatorTextTooLong(message)) return fail('contribution.revision-message-too-long');
  return ok(message === '' ? null : (message as RevisionMessage));
};

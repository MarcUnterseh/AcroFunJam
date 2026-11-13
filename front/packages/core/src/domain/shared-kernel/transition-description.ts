import { fail, ok, type Result } from '../common/result';

/**
 * The optional public description of a transition (story 7, R12): it tells the passage (a position of passage, the
 * grips, a video link as plain text). Shared kernel of Catalog and Contribution (ADR 0028).
 */
export type TransitionDescription = string & { readonly __brand: 'TransitionDescription' };

export type TransitionDescriptionError = 'transition.description-too-long';

/** Same rule as the API (TransitionDescription.MaxLength). */
export const transitionDescriptionPolicy = { maxLength: 500 } as const;

/**
 * As the API normalises it (Q105): NFC, every line ending as a line feed, the spaces and line breaks at the start and
 * the end removed; the line breaks and spaces inside are kept, unlike a proposal text.
 */
export const normalizeTransitionDescription = (raw: string): string =>
  raw.normalize('NFC').replace(/\r\n?/g, '\n').trim();

/** Length once normalised, in code points: the measure of the API. */
export const transitionDescriptionLength = (raw: string): number =>
  [...normalizeTransitionDescription(raw)].length;

/** The normalised description, null when there is none (empty, or made only of spaces), or the rule it breaks. */
export const checkTransitionDescription = (
  raw: string,
): Result<TransitionDescription | null, TransitionDescriptionError> => {
  const description = normalizeTransitionDescription(raw);
  if (description === '') return ok(null);
  if ([...description].length > transitionDescriptionPolicy.maxLength)
    return fail('transition.description-too-long');
  return ok(description as TransitionDescription);
};

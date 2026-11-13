import { fail, ok, type Result } from '../common/result';
import { normalizePoseName, poseNameLength, poseNamePolicy } from './pose-name';

/**
 * The usual name of a transition (« Ninja Star »), optional (story 7, R8): when given, it follows the rules of the name
 * of a pose. Shared kernel of Catalog and Contribution (ADR 0015, ADR 0028).
 */
export type TransitionName = string & { readonly __brand: 'TransitionName' };

export type TransitionNameError = 'transition.name-without-letter-or-digit' | 'transition.name-too-long';

/** Same rule as the API (TransitionName.MaxLength) and as the name of a pose. */
export const transitionNamePolicy = poseNamePolicy;

/** Length of the name once normalised, in code points: the measure of the API. */
export const transitionNameLength = poseNameLength;

/**
 * The normalised name, null when there is none (empty, or made only of spaces: a transition without a name), or the
 * rule it breaks (same codes as the API): a name made only of punctuation is refused (Q107).
 */
export const checkTransitionName = (raw: string): Result<TransitionName | null, TransitionNameError> => {
  const name = normalizePoseName(raw);
  if (name === '') return ok(null);
  if (!/[\p{L}\p{Nd}]/u.test(name)) return fail('transition.name-without-letter-or-digit');
  if ([...name].length > transitionNamePolicy.maxLength) return fail('transition.name-too-long');
  return ok(name as TransitionName);
};

import { fail, type Result } from '../../domain/common/result';
import { tagAccessError, type TagAccessError } from './tag-list';
import type { TagTransitionFailure, TransitionTaggingGateway } from './TransitionTaggingGateway';

// Story 8 « Étiquettes », part 2: a validator or an administrator tags a published transition from the page of a pose.

/** Why the tags of a transition were not recorded: what the site tells the validator, in the zone « Étiqueter ». */
export type TagTransitionError =
  | TagAccessError
  | { readonly kind: 'not-found' }
  | { readonly kind: 'tags-not-in-list'; readonly tagIds: readonly string[] };

/** Replaces the tags of a published transition by the chosen ones (none: removes them all). */
export const tagTransition = async (
  gateway: TransitionTaggingGateway,
  transitionId: string,
  tagIds: readonly string[],
): Promise<Result<void, TagTransitionError>> => {
  const answer = await gateway.tagTransition(transitionId, tagIds);
  if (answer.ok) return answer;
  const failure: TagTransitionFailure = answer.error;
  return fail(
    failure.kind === 'not-found' || failure.kind === 'tags-not-in-list' ? failure : tagAccessError(failure),
  );
};

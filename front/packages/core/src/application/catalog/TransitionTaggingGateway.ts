import type { Result } from '../../domain/common/result';
import type { TagAccessFailure } from './TagListGateway';

/** Why the API did not record the tags of a published transition. */
export type TagTransitionFailure =
  | TagAccessFailure
  /** The transition is not (any longer) in the catalog. */
  | { readonly kind: 'not-found' }
  /** Chosen tags left the list of tags meanwhile (ADR 0034). */
  | { readonly kind: 'tags-not-in-list'; readonly tagIds: readonly string[] };

/**
 * Port: tagging a published transition (story 8, ADR 0034), by a validator or an administrator. Implemented by
 * @acrofunjam/api-client.
 */
export interface TransitionTaggingGateway {
  /** Replaces the tags of the transition by these (none: removes them all); the list adds the implied ones. */
  tagTransition(transitionId: string, tagIds: readonly string[]): Promise<Result<void, TagTransitionFailure>>;
}

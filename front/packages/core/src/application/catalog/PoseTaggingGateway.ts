import type { Result } from '../../domain/common/result';
import type { TagAccessFailure } from './TagListGateway';

/** Why the API did not record the tags of a published pose (story 9a, ADR 0036). */
export type PoseTaggingFailure =
  | TagAccessFailure
  /** The pose is not (any longer) in the catalog. */
  | { readonly kind: 'not-found' }
  /** A revision of the pose is pending: decide on it first. */
  | { readonly kind: 'revision-pending' }
  /** Chosen tags left the list of tags meanwhile. */
  | { readonly kind: 'tags-not-in-list'; readonly tagIds: readonly string[] }
  /** Chosen tags ceased to apply to the poses meanwhile (ADR 0035). */
  | { readonly kind: 'tags-not-applicable'; readonly tagIds: readonly string[] };

/**
 * Port: tagging a published pose directly (story 9a, ADR 0036), by a validator or an administrator. Implemented by
 * @acrofunjam/api-client.
 */
export interface PoseTaggingGateway {
  /** Replaces the tags of the pose by these (none: removes them all). */
  tagPose(poseId: string, tagIds: readonly string[]): Promise<Result<void, PoseTaggingFailure>>;
}

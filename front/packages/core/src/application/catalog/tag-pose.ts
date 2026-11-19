import { fail, type Result } from '../../domain/common/result';
import type { PoseTaggingFailure, PoseTaggingGateway } from './PoseTaggingGateway';
import { tagAccessError, type TagAccessError } from './tag-list';

// Story 9a « Étiqueter les poses »: a validator or an administrator tags a published pose from its page (ADR 0036).

/** Why the tags of a pose were not recorded: what the site tells the validator, in the zone « Étiquettes de la pose ». */
export type TagPoseError =
  TagAccessError | Exclude<PoseTaggingFailure, { readonly kind: 'unauthenticated' | 'forbidden' }>;

/** Replaces the tags of a published pose by the chosen ones (none: removes them all). */
export const tagPose = async (
  gateway: PoseTaggingGateway,
  poseId: string,
  tagIds: readonly string[],
): Promise<Result<void, TagPoseError>> => {
  const answer = await gateway.tagPose(poseId, tagIds);
  if (answer.ok) return answer;
  const failure = answer.error;
  return fail(
    failure.kind === 'unauthenticated' || failure.kind === 'forbidden' ? tagAccessError(failure) : failure,
  );
};

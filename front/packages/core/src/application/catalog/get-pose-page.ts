import type { PosePage } from '../../domain/catalog/pose-page';
import type { Result } from '../../domain/common/result';
import type { PosePageFailure, PosePageGateway } from './PosePageGateway';

// Story 7 « Proposer une transition », volet Catalogue: the page of a pose, for every visitor.

export type PosePageError = PosePageFailure;

/**
 * The page of a published pose: the pose and its transitions, or why it cannot be shown (unknown pose, outage,
 * outdated site), which the site tells apart from a pose without transitions.
 */
export const getPosePage = (
  gateway: PosePageGateway,
  poseId: string,
): Promise<Result<PosePage, PosePageError>> => gateway.getPosePage(poseId);

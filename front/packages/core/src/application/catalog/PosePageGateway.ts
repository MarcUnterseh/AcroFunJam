import type { PosePage } from '../../domain/catalog/pose-page';
import type { Result } from '../../domain/common/result';

/** Why the catalog did not give the page of a pose. */
export type PosePageFailure =
  /** No published pose with this id (glossary « Pose publiée »): « Pose introuvable ». */
  | { readonly kind: 'not-found' }
  | { readonly kind: 'unreachable' }
  /** An answer the site cannot read: it must be reloaded (ADR 0019). */
  | { readonly kind: 'outdated' };

/**
 * Port: the page of a published pose in the catalog (story 7, ADR 0030), implemented by @acrofunjam/api-client: the
 * pose and its transitions from and to it, in one request.
 */
export interface PosePageGateway {
  getPosePage(poseId: string): Promise<Result<PosePage, PosePageFailure>>;
}

import type { Result } from '../../domain/common/result';
import type { RevisablePose, ValidPoseRevision } from '../../domain/contribution/pose-revision';
import type { ProposalOutcome } from './ContributionGateway';

/** The pending revision of a pose (one at most, decision D): only whether the requester proposed it. */
export type PendingRevision = { readonly isYours: boolean };

/** Why the site cannot open the form « Proposer une modification », or read the pose again. */
export type RevisionOpeningFailure =
  /** No published pose with this id (glossary « Pose publiée »). */
  | { readonly kind: 'not-found' }
  /** Visitor, expired session or deleted account (401, ADR 0018). */
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  /** An answer the site cannot read: it must be reloaded (ADR 0019). */
  | { readonly kind: 'outdated' };

/** Why the API did not receive a revision. */
export type RevisionFailure =
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  /** The pose changed since the form was opened (version control, R10). */
  | { readonly kind: 'pose-changed' }
  /** Another revision of the pose was proposed meanwhile (decision D). */
  | { readonly kind: 'revision-already-pending' }
  /** The pose left the catalog meanwhile. */
  | { readonly kind: 'not-found' }
  /** Identical to the pose for the API, which normalises as the site does (Q30). */
  | { readonly kind: 'changes-nothing' }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

/**
 * Port: the revision of a published pose (story 6), implemented by @acrofunjam/api-client. Contribution reads the
 * published pose through its own port (anti-corruption layer): the bounded contexts do not import each other.
 */
export interface PoseRevisionGateway {
  /** The published pose, with its current values and its version (GET /catalog/poses/{id}). */
  getRevisablePose(poseId: string): Promise<Result<RevisablePose, RevisionOpeningFailure>>;
  /** The pending revision of the pose, null when it has none. */
  getPendingRevision(poseId: string): Promise<Result<PendingRevision | null, RevisionOpeningFailure>>;
  proposePoseRevision(revision: ValidPoseRevision): Promise<Result<ProposalOutcome, RevisionFailure>>;
}

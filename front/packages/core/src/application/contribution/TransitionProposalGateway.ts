import type { Result } from '../../domain/common/result';
import type { TransitionPose, ValidTransitionProposal } from '../../domain/contribution/transition-proposal';
import type { ChoosableTag } from '../../domain/shared-kernel/tags';

/** What became of a received transition, as stated by the API (never guessed from the role): ADR 0019, ADR 0030. */
export type TransitionProposalOutcome = {
  /** "received": the API received it, but its status could not be read (a newer API). */
  readonly status: 'pending' | 'published' | 'received';
  /** Its poses under their current names, and its normalised name (null: a transition without a name). */
  readonly fromPose: TransitionPose;
  readonly toPose: TransitionPose;
  readonly name: string | null;
};

/** The place of the transition between its poses, in this direction, is taken (ADR 0029). */
export type TransitionPlaceTaken =
  | 'transition-name-already-in-catalog'
  | 'transition-name-already-pending'
  | 'unnamed-transition-already-in-catalog'
  | 'unnamed-transition-already-pending';

/** Why the API did not receive a transition. */
export type TransitionProposalFailure =
  | { readonly kind: TransitionPlaceTaken }
  /** The pose left the catalog since the form was opened (or never was in it). */
  | { readonly kind: 'from-pose-not-found' }
  | { readonly kind: 'to-pose-not-found' }
  /** Story 8: chosen tags left the list of tags since the form was opened (ADR 0034). */
  | { readonly kind: 'tags-not-in-list'; readonly tagIds: readonly string[] }
  /** Visitor, expired session or deleted account (ADR 0018): the site handles it as an expired session. */
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  /** A refusal the site does not know, or of a content rule it checks before sending: it must be reloaded. */
  | { readonly kind: 'outdated' };

/** Why the published poses could not be read. */
export type TransitionPosesFailure = { readonly kind: 'unreachable' } | { readonly kind: 'outdated' };

/**
 * Port: proposing a transition (story 7), implemented by @acrofunjam/api-client. Contribution reads the published poses
 * through its own port (anti-corruption layer): the bounded contexts do not import each other.
 */
export interface TransitionProposalGateway {
  /** The published poses, in catalog order (GET /catalog/poses): the choices of the two drop-down lists. */
  listPublishedPoses(): Promise<Result<readonly TransitionPose[], TransitionPosesFailure>>;
  /** Story 8: the tags of the list, in catalog order (GET /catalog/tags): the choices of the group « Étiquettes ». */
  listTags(): Promise<Result<readonly ChoosableTag[], TransitionPosesFailure>>;
  proposeTransition(
    transition: ValidTransitionProposal,
  ): Promise<Result<TransitionProposalOutcome, TransitionProposalFailure>>;
}

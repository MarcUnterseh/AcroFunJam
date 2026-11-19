import type { Result } from '../../domain/common/result';
import type { MyProposal } from '../../domain/contribution/my-pose-proposal';
import type { ValidPoseProposal } from '../../domain/contribution/pose-proposal';
import type { ChoosableTag } from '../../domain/shared-kernel/tags';

/** What became of a received proposal, as stated by the API (never guessed from the role): ADR 0019. */
export type ProposalOutcome = {
  /** "received": the API received it, but its status could not be read (a newer API). */
  readonly status: 'pending' | 'published' | 'received';
  /** The normalised name, as received by the API. */
  readonly name: string;
};

/** Why the API did not receive a proposal. */
export type ProposalFailure =
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  /** Story 9a: chosen tags left the list, or ceased to apply to the poses, meanwhile (ADR 0035, ADR 0036). */
  | { readonly kind: 'tags-not-in-list' | 'tags-not-applicable'; readonly tagIds: readonly string[] }
  /** Visitor, expired session or deleted account (ADR 0018): the site handles it as an expired session. */
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  /**
   * A refusal the site does not know (unknown code), or of a content rule the site checks before sending (400): the
   * site must be reloaded to be up to date (ADR 0019).
   */
  | { readonly kind: 'outdated' };

/** Why the API did not give the proposals of the requester (« Mes propositions », story 5). */
export type MyProposalsFailure =
  /** Visitor, expired session or deleted account (401, ADR 0018): the site handles it as an expired session. */
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  /** An answer the site cannot read (unknown refusal, unreadable pose): it must be reloaded (ADR 0019). */
  | { readonly kind: 'outdated' };

/** Port: the Contribution API (implemented by @acrofunjam/api-client). */
export interface ContributionGateway {
  proposePose(proposal: ValidPoseProposal): Promise<Result<ProposalOutcome, ProposalFailure>>;
  /** The proposals of the requester, the most recently submitted first (the order is guaranteed by the API). */
  getMyProposals(): Promise<Result<readonly MyProposal[], MyProposalsFailure>>;
  /** Story 9a: the tags of the list, to choose those of a pose (the use case keeps those applying to poses). */
  listTags(): Promise<Result<readonly ChoosableTag[], { readonly kind: 'unreachable' | 'outdated' }>>;
}

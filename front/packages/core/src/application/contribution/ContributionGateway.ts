import type { Result } from '../../domain/common/result';
import type { ProposalFieldError, ValidPoseProposal } from '../../domain/contribution/pose-proposal';

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
  | { readonly kind: 'invalid-content'; readonly errors: readonly ProposalFieldError[] }
  /** Visitor, expired session or deleted account (ADR 0018): the site handles it as an expired session. */
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unreachable' }
  /** A refusal the site does not know (unknown code): the site must be reloaded to be up to date. */
  | { readonly kind: 'outdated' };

/** Port: the Contribution API (implemented by @acrofunjam/api-client). */
export interface ContributionGateway {
  proposePose(proposal: ValidPoseProposal): Promise<Result<ProposalOutcome, ProposalFailure>>;
}

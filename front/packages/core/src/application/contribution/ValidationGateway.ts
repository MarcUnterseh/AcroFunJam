import type { Result } from '../../domain/common/result';
import type { AdjustmentNote } from '../../domain/contribution/adjustment-note';
import type { PoseAdjustment } from '../../domain/contribution/pose-adjustment';
import type { ValidPoseProposal } from '../../domain/contribution/pose-proposal';
import type { RejectionReason } from '../../domain/contribution/rejection-reason';

/** Who made a proposal: their address (null if the account no longer exists), and whether it is the requester. */
export type ProposalContributor = { readonly email: string | null; readonly isYou: boolean };

/** A proposal pending validation, as the validation queue presents it (glossary « File de validation »). */
export type PendingProposal = {
  readonly id: string;
  /** The proposed pose (its name is normalised). */
  readonly pose: ValidPoseProposal;
  readonly contributor: ProposalContributor;
  readonly submittedAt: Date;
};

/** What the validator sends to accept a proposal: the adjusted values only, and the optional note. */
export type Acceptance = {
  readonly adjustments: readonly PoseAdjustment[];
  readonly note: AdjustmentNote | null;
};

/** The pose published by an acceptance, as stated by the API: its retained name, and whether it was adjusted. */
export type AcceptanceOutcome = { readonly name: string; readonly adjusted: boolean };

/** Why the API refused to show the queue or to decide, whatever the proposal. */
export type AccessFailure =
  /** Visitor, expired session or deleted account (401, ADR 0018). */
  | { readonly kind: 'unauthenticated' }
  /** Signed in, without the capability "validate-proposals" (403): the role was withdrawn meanwhile. */
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'unreachable' }
  /** A refusal the site does not know (unknown code): the site must be reloaded to be up to date. */
  | { readonly kind: 'outdated' };

/** Why the API did not record a decision. */
export type DecisionFailure =
  | AccessFailure
  /** Already accepted or rejected, by someone else or by the same validator (glossary « Proposition traitée »). */
  | { readonly kind: 'already-decided' }
  | { readonly kind: 'not-found' }
  /** The retained name is taken (ADR 0017): by a published pose, or by another pending proposal. */
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' };

/** Port: the validation of proposals by the Contribution API (implemented by @acrofunjam/api-client). */
export interface ValidationGateway {
  getValidationQueue(): Promise<Result<readonly PendingProposal[], AccessFailure>>;
  countPendingProposals(): Promise<Result<number, AccessFailure>>;
  acceptProposal(id: string, acceptance: Acceptance): Promise<Result<AcceptanceOutcome, DecisionFailure>>;
  rejectProposal(id: string, reason: RejectionReason): Promise<Result<void, DecisionFailure>>;
}

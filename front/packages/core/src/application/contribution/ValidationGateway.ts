import type { Result } from '../../domain/common/result';
import type { AdjustmentNote } from '../../domain/contribution/adjustment-note';
import type { PoseAdjustment } from '../../domain/contribution/pose-adjustment';
import type { PoseContent, ValidPoseProposal } from '../../domain/contribution/pose-proposal';
import type { PoseValueChange } from '../../domain/contribution/pose-revision';
import type { RejectionReason } from '../../domain/contribution/rejection-reason';
import type { RevisionMessage } from '../../domain/contribution/revision-message';

/** Who made a proposal: their address (null if the account no longer exists), and whether it is the requester. */
export type ProposalContributor = { readonly email: string | null; readonly isYou: boolean };

/** A pose proposal pending validation, as the validation queue presents it (glossary « File de validation »). */
export type PendingPoseProposal = {
  readonly kind: 'pose-proposal';
  readonly id: string;
  /** The proposed pose (its name is normalised). */
  readonly pose: ValidPoseProposal;
  readonly contributor: ProposalContributor;
  readonly submittedAt: Date;
};

/** A revision proposal pending validation (story 6, ADR 0027): the pose as it is, and what would change. */
export type PendingPoseRevision = {
  readonly kind: 'pose-revision';
  readonly id: string;
  /** The published pose, with its current values. */
  readonly pose: PoseContent & { readonly id: string };
  /** The changed fields only, in the order of the form: current → proposed. */
  readonly changes: readonly PoseValueChange[];
  readonly message: RevisionMessage | null;
  readonly contributor: ProposalContributor;
  readonly submittedAt: Date;
};

/** An item of the validation queue: a pose proposal or a revision proposal, mixed, the oldest first. */
export type PendingProposal = PendingPoseProposal | PendingPoseRevision;

/** Which proposal a decision is about: the API decides each kind at its own address. */
export type ProposalReference = Pick<PendingProposal, 'kind' | 'id'>;

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
  | { readonly kind: 'name-already-pending' }
  /** A revision whose retained values would leave the pose as it is (story 6, R15). */
  | { readonly kind: 'retained-revision-changes-nothing' }
  /** The pose of a revision changed since it was proposed (story 6, safety net of the API). */
  | { readonly kind: 'pose-changed' };

/** Port: the validation of proposals by the Contribution API (implemented by @acrofunjam/api-client). */
export interface ValidationGateway {
  getValidationQueue(): Promise<Result<readonly PendingProposal[], AccessFailure>>;
  countPendingProposals(): Promise<Result<number, AccessFailure>>;
  acceptProposal(
    proposal: ProposalReference,
    acceptance: Acceptance,
  ): Promise<Result<AcceptanceOutcome, DecisionFailure>>;
  rejectProposal(
    proposal: ProposalReference,
    reason: RejectionReason,
  ): Promise<Result<void, DecisionFailure>>;
}

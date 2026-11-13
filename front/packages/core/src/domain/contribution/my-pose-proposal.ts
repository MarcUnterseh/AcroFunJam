import type { AdjustmentNote } from './adjustment-note';
import type { PoseAdjustment } from './pose-adjustment';
import type { PoseName } from '../shared-kernel/pose-name';
import type { PoseContent } from './pose-proposal';
import type { PoseValueChange } from './pose-revision';
import type { RejectionReason } from './rejection-reason';

/**
 * What became of a proposal, for its contributor (glossary « Statut pour le contributeur », ADR 0023): never who
 * decided. "unknown": a status the site cannot read (an API newer than the site).
 */
export type MyProposalStatus =
  | { readonly kind: 'pending' }
  | { readonly kind: 'accepted'; readonly decidedAt: Date }
  | {
      readonly kind: 'accepted-with-adjustments';
      readonly decidedAt: Date;
      /** The adjusted fields only, in the order of the form: proposed → retained. */
      readonly adjustments: readonly PoseAdjustment[];
      readonly message: AdjustmentNote | null;
    }
  | { readonly kind: 'rejected'; readonly decidedAt: Date; readonly reason: RejectionReason }
  /** Proposed by a validator or an administrator: published at once, without a decision date. */
  | { readonly kind: 'published-directly' }
  | { readonly kind: 'unknown' };

/**
 * A pose proposal of the requester, as « Mes propositions » presents it (glossary « Mes propositions »). The
 * presented pose is the retained one once accepted (the pose of the catalog), the proposed one otherwise.
 */
export type MyPoseProposal = {
  readonly kind: 'pose-proposal';
  readonly id: string;
  readonly pose: PoseContent;
  readonly submittedAt: Date;
  readonly status: MyProposalStatus;
};

/**
 * A revision proposal of the requester (story 6, ADR 0027): the pose by its name when proposed, and what changes in
 * it, before → after (« valeur d'avant », frozen when proposed → the retained value once accepted, the proposed one
 * otherwise), the changed fields only, in the order of the form.
 */
export type MyPoseRevision = {
  readonly kind: 'pose-revision';
  readonly id: string;
  readonly poseName: PoseName;
  readonly submittedAt: Date;
  readonly status: MyProposalStatus;
  readonly changes: readonly PoseValueChange[];
};

/** An item of « Mes propositions »: a pose proposal or a revision proposal, mixed, the most recent first. */
export type MyProposal = MyPoseProposal | MyPoseRevision;

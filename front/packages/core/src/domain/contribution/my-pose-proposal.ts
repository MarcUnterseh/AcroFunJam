import type { AdjustmentNote } from './adjustment-note';
import type { PoseAdjustment } from './pose-adjustment';
import type { PoseContent } from './pose-proposal';
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
 * A proposal of the requester, as « Mes propositions » presents it (glossary « Mes propositions »). The presented
 * pose is the retained one once accepted (the pose of the catalog), the proposed one otherwise.
 */
export type MyProposal = {
  readonly id: string;
  readonly pose: PoseContent;
  readonly submittedAt: Date;
  readonly status: MyProposalStatus;
};

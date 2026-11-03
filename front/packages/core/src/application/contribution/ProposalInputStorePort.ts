import type { PoseProposalInput } from '../../domain/contribution/pose-proposal';

/** The kept input and its owner: the address of the session it was typed in. */
export type KeptProposalInput = { readonly owner: string; readonly input: PoseProposalInput };

/**
 * Port: the input of the form « Proposer une pose » kept in the tab (glossary « Saisie conservée », ADR 0019),
 * to be found again by the same person after an expired session or an outage. Not a proposal. Implemented by
 * the site on sessionStorage; every method must be safe when the storage is unavailable.
 */
export interface ProposalInputStore {
  load(): KeptProposalInput | null;
  save(kept: KeptProposalInput): void;
  clear(): void;
}

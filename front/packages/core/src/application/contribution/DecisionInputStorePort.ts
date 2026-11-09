import type { PoseProposalInput } from '../../domain/contribution/pose-proposal';

/** What the validator typed for a decision that could not be sent: the reason, or the adjustments and the note. */
export type KeptDecision =
  | { readonly kind: 'rejection'; readonly reason: string }
  | { readonly kind: 'acceptance'; readonly input: PoseProposalInput; readonly note: string };

/** The kept inputs, by proposal id, and their owner: the address of the session they were typed in. */
export type KeptDecisionInputs = {
  readonly owner: string;
  readonly decisions: Readonly<Record<string, KeptDecision>>;
};

/**
 * Port: the input of the decisions on proposals kept in the tab (glossary « Saisie conservée », ADR 0019), to be
 * found again by the same person after an expired session or an outage. Implemented by the site on
 * sessionStorage; every method must be safe when the storage is unavailable.
 */
export interface DecisionInputStore {
  load(): KeptDecisionInputs | null;
  save(kept: KeptDecisionInputs): void;
  clear(): void;
}

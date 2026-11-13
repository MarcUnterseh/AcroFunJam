import type { PoseRevisionInput } from '../../domain/contribution/pose-revision';

/** The kept input of a revision and its owner: the address of the session it was typed in. */
export type KeptRevisionInput = { readonly owner: string; readonly input: PoseRevisionInput };

/**
 * Port: the input of the form « Proposer une modification » kept in the tab (glossary « Saisie conservée », ADR
 * 0019), by pose: the person finds it again on the form of the same pose after an expired session or an outage.
 * Implemented by the site on sessionStorage; every method must be safe when the storage is unavailable.
 */
export interface RevisionInputStore {
  load(poseId: string): KeptRevisionInput | null;
  save(poseId: string, kept: KeptRevisionInput): void;
  clear(poseId: string): void;
}

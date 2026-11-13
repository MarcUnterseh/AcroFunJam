import type { PoseRevisionInput } from '../../domain/contribution/pose-revision';
import type { KeptInput, KeyedInputStore } from './KeyedInputStorePort';

/** The kept input of a revision and its owner: the address of the session it was typed in. */
export type KeptRevisionInput = KeptInput<PoseRevisionInput>;

/**
 * Port: the input of the form « Proposer une modification » kept in the tab (ADR 0019), by pose: the person finds it
 * again on the form of the same pose after an expired session or an outage.
 */
export type RevisionInputStore = KeyedInputStore<PoseRevisionInput>;

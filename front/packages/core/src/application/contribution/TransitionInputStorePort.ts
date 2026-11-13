import type { TransitionProposalInput } from '../../domain/contribution/transition-proposal';
import type { KeptInput, KeyedInputStore } from './KeyedInputStorePort';

/** The kept input of a transition and its owner: the address of the session it was typed in. */
export type KeptTransitionInput = KeptInput<TransitionProposalInput>;

/**
 * Port: the input of the form « Proposer une transition » kept in the tab (ADR 0019), by pose of origin (the pose
 * consulted): the person finds it again on the form opened from the same pose after an expired session or an outage.
 */
export type TransitionInputStore = KeyedInputStore<TransitionProposalInput>;

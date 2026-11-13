import type { TransitionProposalInput } from '@acrofunjam/core';
import { isRecord, level } from './kept-input-parsing';
import { createKeyedSessionStore } from './keyed-session-store';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The values of a transition typed in the form, as stored: an unknown value is not trusted (left unanswered). */
const parseTransitionInput = (value: unknown): TransitionProposalInput | null => {
  if (!isRecord(value)) return null;
  return {
    fromPoseId: text(value['fromPoseId']),
    toPoseId: text(value['toPoseId']),
    name: text(value['name']),
    baseDifficulty: level(value['baseDifficulty']),
    flyerDifficulty: level(value['flyerDifficulty']),
    description: text(value['description']),
  };
};

/**
 * TransitionInputStore on sessionStorage (ADR 0019): the input of the form « Proposer une transition » stays in this
 * tab, by pose of origin, and disappears with it. Not a proposal (glossary « Saisie conservée »); stored with its owner.
 */
export const createSessionTransitionInputStore = (storage: Storage) =>
  createKeyedSessionStore(storage, 'afj-transition-input:', parseTransitionInput);

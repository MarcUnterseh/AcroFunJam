import type { PoseRevisionInput } from '@acrofunjam/core';
import { isRecord, parseProposalInput } from './kept-input-parsing';
import { createKeyedSessionStore } from './keyed-session-store';

/** The values of the pose and the message typed in the form, as stored. */
const parseRevisionInput = (value: unknown): PoseRevisionInput | null => {
  if (!isRecord(value)) return null;
  const values = parseProposalInput(value['values']);
  const message = value['message'];
  return values && typeof message === 'string' ? { values, message } : null;
};

/**
 * RevisionInputStore on sessionStorage (ADR 0019): the input of the form « Proposer une modification » stays in this
 * tab, by pose, and disappears with it. Not a revision (glossary « Saisie conservée »); stored with its owner.
 */
export const createSessionRevisionInputStore = (storage: Storage) =>
  createKeyedSessionStore(storage, 'afj-revision-input:', parseRevisionInput);

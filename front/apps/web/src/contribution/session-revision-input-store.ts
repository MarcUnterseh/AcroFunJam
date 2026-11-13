import type { KeptRevisionInput, RevisionInputStore } from '@acrofunjam/core';
import { attempt, isRecord, parseProposalInput } from './kept-input-parsing';

/** One key per pose: the input of a pose is found again on the form of the same pose only (story 6). */
const prefix = 'afj-revision-input:';
const keyOf = (poseId: string) => `${prefix}${poseId}`;

/** What was stored may come from an older version of the site: anything unexpected is ignored. */
const parse = (raw: string | null): KeptRevisionInput | null => {
  if (raw === null) return null;
  const value: unknown = attempt(() => JSON.parse(raw), null);
  if (!isRecord(value) || typeof value['owner'] !== 'string' || !isRecord(value['input'])) return null;
  const values = parseProposalInput(value['input']['values']);
  const message = value['input']['message'];
  return values && typeof message === 'string' ? { owner: value['owner'], input: { values, message } } : null;
};

/**
 * RevisionInputStore on sessionStorage (ADR 0019): the input of the form « Proposer une modification » stays in
 * this tab, by pose, and disappears with it. Not a revision (glossary « Saisie conservée »); stored with its owner.
 */
export const createSessionRevisionInputStore = (
  storage: Storage,
): RevisionInputStore & { readonly clearAll: () => void } => ({
  load: (poseId) => parse(attempt(() => storage.getItem(keyOf(poseId)), null)),
  save: (poseId, kept) => attempt(() => storage.setItem(keyOf(poseId), JSON.stringify(kept)), undefined),
  clear: (poseId) => attempt(() => storage.removeItem(keyOf(poseId)), undefined),
  /** Signing out forgets the input of every pose (shared device). */
  clearAll: () =>
    attempt(() => {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
        (key): key is string => key?.startsWith(prefix) ?? false,
      );
      for (const key of keys) storage.removeItem(key);
    }, undefined),
});

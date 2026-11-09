import type { KeptProposalInput, ProposalInputStore } from '@acrofunjam/core';
import { attempt, isRecord, parseProposalInput } from './kept-input-parsing';

const key = 'afj-proposal-input';

/** What was stored may come from an older version of the site: anything unexpected is ignored. */
const parse = (raw: string | null): KeptProposalInput | null => {
  if (raw === null) return null;
  const value: unknown = attempt(() => JSON.parse(raw), null);
  if (!isRecord(value) || typeof value['owner'] !== 'string') return null;
  const input = parseProposalInput(value['input']);
  return input && { owner: value['owner'], input };
};

/**
 * ProposalInputStore on sessionStorage (ADR 0019): the input stays in this tab, and disappears with it.
 * Not a proposal (glossary « Saisie conservée »); stored with its owner, the address of the session.
 */
export const createSessionProposalInputStore = (storage: Storage): ProposalInputStore => ({
  load: () => parse(attempt(() => storage.getItem(key), null)),
  save: (kept) => attempt(() => storage.setItem(key, JSON.stringify(kept)), undefined),
  clear: () => attempt(() => storage.removeItem(key), undefined),
});

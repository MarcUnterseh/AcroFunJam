import {
  difficultyScale,
  type DifficultyLevel,
  type KeptProposalInput,
  type ProposalInputStore,
} from '@acrofunjam/core';

const key = 'afj-proposal-input';

const attempt = <T>(action: () => T, fallback: T): T => {
  try {
    return action();
  } catch {
    return fallback; // blocked storage, private browsing, quota: only the kept input is lost (ADR 0019)
  }
};

const level = (value: unknown): DifficultyLevel | null =>
  difficultyScale.find((known) => known === value) ?? null;
const answer = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** What was stored may come from an older version of the site: anything unexpected is ignored. */
const parse = (raw: string | null): KeptProposalInput | null => {
  if (raw === null) return null;
  const value: unknown = attempt(() => JSON.parse(raw), null);
  if (!isRecord(value) || typeof value['owner'] !== 'string' || !isRecord(value['input'])) return null;
  const input = value['input'];
  if (typeof input['name'] !== 'string') return null;
  return {
    owner: value['owner'],
    input: {
      name: input['name'],
      baseDifficulty: level(input['baseDifficulty']),
      flyerDifficulty: level(input['flyerDifficulty']),
      canStartFlow: answer(input['canStartFlow']),
      canEndFlow: answer(input['canEndFlow']),
    },
  };
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

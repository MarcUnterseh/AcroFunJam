import { difficultyScale, type DifficultyLevel, type PoseProposalInput } from '@acrofunjam/core';

/** Runs an access to the storage: blocked storage, private browsing, quota only lose the kept input (ADR 0019). */
export const attempt = <T>(action: () => T, fallback: T): T => {
  try {
    return action();
  } catch {
    return fallback;
  }
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const level = (value: unknown): DifficultyLevel | null =>
  difficultyScale.find((known) => known === value) ?? null;
const answer = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

/** The values of a pose typed in a form, as stored: an unknown value is not trusted (left unanswered). */
export const parseProposalInput = (value: unknown): PoseProposalInput | null => {
  if (!isRecord(value) || typeof value['name'] !== 'string') return null;
  return {
    name: value['name'],
    baseDifficulty: level(value['baseDifficulty']),
    flyerDifficulty: level(value['flyerDifficulty']),
    canStartFlow: answer(value['canStartFlow']),
    canEndFlow: answer(value['canEndFlow']),
  };
};

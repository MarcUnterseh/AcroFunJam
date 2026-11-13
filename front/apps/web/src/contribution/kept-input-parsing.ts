import {
  difficultyScale,
  type DifficultyLevel,
  type PoseProposalInput,
  type TransitionAdjustmentInput,
} from '@acrofunjam/core';

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

/** A stored level of the scale, null when it is not one the site knows (not trusted, left unanswered). */
export const level = (value: unknown): DifficultyLevel | null =>
  difficultyScale.find((known) => known === value) ?? null;
const answer = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

/** The values of a transition typed in the adjustment zone (story 7), as stored. */
export const parseTransitionAdjustmentInput = (value: unknown): TransitionAdjustmentInput | null => {
  if (!isRecord(value) || typeof value['name'] !== 'string' || typeof value['description'] !== 'string')
    return null;
  return {
    name: value['name'],
    baseDifficulty: level(value['baseDifficulty']),
    flyerDifficulty: level(value['flyerDifficulty']),
    description: value['description'],
  };
};

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

import type { DifficultyLevel } from './difficulty-level';

/** A published pose as listed in the catalog. */
export type PoseSummary = {
  readonly id: string;
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
};

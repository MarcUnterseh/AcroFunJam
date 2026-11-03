import type { DifficultyLevel } from '../shared-kernel/difficulty-level';

/** A published pose as listed in the catalog. */
export type PoseSummary = {
  readonly id: string;
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  /** The duo can settle into the pose directly from the ground. */
  readonly canStartFlow: boolean;
  /** The flyer can come down to the ground directly and safely. */
  readonly canEndFlow: boolean;
};

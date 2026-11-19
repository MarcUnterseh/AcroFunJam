import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import type { TagReference } from '../shared-kernel/tags';

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
  /** Story 9a: its tags under their current names, in catalog order (none: an empty list). */
  readonly tags: readonly TagReference[];
};

import { difficultyLevelName, difficultyScale, proposalLabels, type DifficultyLevel } from '@acrofunjam/core';
import type { TileOption } from '../layout/TileRadioGroup';

/** The choices of the groups of radio tiles of a pose (forms « Proposer une pose » and « Ajuster avant de publier »). */
export const levels: readonly TileOption<DifficultyLevel>[] = difficultyScale.map((level) => ({
  value: level,
  label: difficultyLevelName(level),
  phase: level,
}));

export type Answer = 'yes' | 'no';

export const answers: readonly TileOption<Answer>[] = [
  { value: 'yes', label: proposalLabels.yes },
  { value: 'no', label: proposalLabels.no },
];

export const answerOf = (value: boolean | null): Answer | null =>
  value === null ? null : value ? 'yes' : 'no';

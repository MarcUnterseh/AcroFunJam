import type { DifficultyLevel } from '../../domain/shared-kernel/difficulty-level';

const names: Readonly<Record<DifficultyLevel, string>> = {
  discovery: 'Découverte',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

/**
 * Name of a level shown on its own (card value, legend item, tile of the proposal form): capitalised.
 * Shared kernel of Catalog and Contribution (ADR 0015).
 */
export const difficultyLevelName = (level: DifficultyLevel): string => names[level];

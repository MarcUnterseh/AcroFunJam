/** Difficulty of a pose or transition for one role, from the most accessible to the most demanding. */
export type DifficultyLevel = 'discovery' | 'beginner' | 'intermediate' | 'advanced';

const frenchLabels: Readonly<Record<DifficultyLevel, string>> = {
  discovery: 'découverte',
  beginner: 'débutant',
  intermediate: 'intermédiaire',
  advanced: 'avancé',
};

/** French label of a difficulty level, shared by the web and mobile apps (ADR 0007). */
export const difficultyLevelLabel = (level: DifficultyLevel): string => frenchLabels[level];

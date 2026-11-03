/** Difficulty of a pose or transition for one role, from the most accessible to the most demanding. */
export type DifficultyLevel = 'discovery' | 'beginner' | 'intermediate' | 'advanced';

/** The ordered scale: découverte < débutant < intermédiaire < avancé. Labels: presentation/catalog-labels. */
export const difficultyScale: readonly DifficultyLevel[] = [
  'discovery',
  'beginner',
  'intermediate',
  'advanced',
];

/** Position of a level on the scale, from 1 (découverte) to 4 (avancé). */
export const difficultyRank = (level: DifficultyLevel): number => difficultyScale.indexOf(level) + 1;

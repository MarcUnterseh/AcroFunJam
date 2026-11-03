import type { DifficultyLevel } from '../domain/catalog/difficulty-level';

/**
 * Presentation: French texts of the catalog screens (informal tone, docs/design/principes.md), shared by the
 * web and mobile apps. They live outside core/domain, which keeps the language of the domain only.
 */
export const catalogLabels = {
  title: 'Catalogue des poses',
  poseList: 'Poses du catalogue',
  loading: 'Chargement du catalogue…',
  loadingFailed: 'Impossible de charger le catalogue. Vérifie ta connexion Internet, puis réessaie.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  empty: 'Le catalogue ne contient encore aucune pose.',
  emptyInvitation: 'Propose la première pose du catalogue.',
  proposePose: 'Proposer une pose',
  scaleIntroduction: 'Niveaux de difficulté, du plus accessible au plus exigeant :',
  responsibilityWarning:
    'Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin.',
  base: 'Base',
  flyer: 'Flyer',
  canStartFlow: 'Peut commencer un flow',
  canEndFlow: 'Peut terminer un flow',
} as const;

const names: Readonly<Record<DifficultyLevel, string>> = {
  discovery: 'Découverte',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

/** Name of a level shown on its own (card value, legend item): capitalised. */
export const difficultyLevelName = (level: DifficultyLevel): string => names[level];

/** Number of poses above the cards; the order is stated because it is not obvious. */
export const poseCountLabel = (count: number): string =>
  `${count} ${count === 1 ? 'pose' : 'poses'}, par ordre alphabétique`;

/** Answer to "Peut commencer un flow" / "Peut terminer un flow", always written out. */
export const flowBoundaryAnswer = (possible: boolean): string => (possible ? 'Oui' : 'Non');

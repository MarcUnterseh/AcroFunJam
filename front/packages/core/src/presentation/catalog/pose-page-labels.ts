/**
 * Presentation: French texts of the page of a pose (story 7, docs/design/ecrans/7-proposer-une-transition.md and the
 * components it references), shared by the web and mobile apps. The texts marked « proposé » in the design are kept
 * as proposed.
 */
export const posePageLabels = {
  /** The link back to the catalog, at the top of the page (lien-retour.md). */
  back: 'Catalogue',
  loading: 'Chargement de la pose…',
  loadingFailed: 'Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie.',
  loadingOutdated: 'Impossible de charger la pose : le site doit être mis à jour. Recharge la page.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  reload: 'Recharger la page',
  notFoundTitle: 'Pose introuvable',
  notFoundText: "Cette pose n'est pas dans le catalogue.",
  seeCatalog: 'Voir le catalogue',
  /** Shortened warning of the page of a pose (legende-echelle.md, « Variante page d'une pose », Q106). */
  responsibilityWarning:
    'Tu restes juge de tes limites. Les chutes arrivent surtout pendant les transitions : apprends-les avec un spotter.',
  /** After the other pose of a washing machine, outside its link. */
  samePose: '(même pose)',
  proposeRevision: 'Proposer une modification',
} as const;

/** The two sections of the page: the transitions from the pose, and those to it. */
export type TransitionDirection = 'from' | 'to';

/** « Transitions depuis Throne » / « Transitions vers Throne » (current name of the pose). */
export const transitionsSectionTitle = (direction: TransitionDirection, poseName: string): string =>
  `Transitions ${direction === 'from' ? 'depuis' : 'vers'} ${poseName}`;

/** A section without any transition says so, in place of its list. */
export const emptyTransitionsLabel = (direction: TransitionDirection, poseName: string): string =>
  direction === 'from'
    ? `Aucune transition ne part de ${poseName} pour l'instant.`
    : `Aucune transition n'arrive à ${poseName} pour l'instant.`;

/** « Vers Bird » among the transitions from the pose, « Depuis Throne » among those to it. */
export const otherPoseLead = (direction: TransitionDirection): string =>
  direction === 'from' ? 'Vers' : 'Depuis';

/**
 * The default label of a transition without a name (glossary « Libellé par défaut »): shown « Throne → Bird », the
 * arrow drawn between the two names by the apps and hidden from assistive technologies, which read « de Throne vers
 * Bird ».
 */
export const unnamedTransitionLabel = ({
  from,
  to,
}: {
  readonly from: string;
  readonly to: string;
}): { readonly shown: readonly [string, string]; readonly spoken: string } => ({
  shown: [from, to],
  spoken: `de ${from} vers ${to}`,
});

/** The primary action of the page, for a person who may propose (story 7). */
export const proposeTransitionFromLabel = (poseName: string): string =>
  `Proposer une transition depuis ${poseName}`;

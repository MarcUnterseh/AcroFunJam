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

/** Texts of the zone « Étiqueter » of a published transition (story 8, zone-etiqueter.md), validators only. */
export const transitionTaggingLabels = {
  tag: 'Étiqueter',
  legend: 'Étiquettes de la transition',
  save: 'Enregistrer les étiquettes',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  saved: 'Étiquettes enregistrées.',
  loading: 'Chargement des étiquettes…',
  loadingFailed:
    'Impossible de charger la liste des étiquettes. Vérifie ta connexion Internet, puis réessaie.',
  retry: 'Réessayer',
  reload: 'Recharger la page',
  signIn: 'Se connecter',
} as const;

/** The accessible name of the button: « Étiqueter Pop to Bird », « Étiqueter de Bird vers Folded Leaf ». */
export const tagTransitionButtonName = (transition: string): string =>
  `${transitionTaggingLabels.tag} ${transition}`;

/** Why the tags of a transition were not recorded, as the zone tells it. */
export type TransitionTaggingFailure = {
  readonly kind:
    'session-expired' | 'role-withdrawn' | 'unreachable' | 'outdated' | 'not-found' | 'tags-not-in-list';
};

/** The failures of a zone « Étiqueter » whatever is tagged (a transition, a pose): the outage, an outdated site. */
const commonTaggingFailureLabel = (kind: 'unreachable' | 'outdated'): string =>
  kind === 'unreachable'
    ? "Les étiquettes n'ont pas pu être enregistrées : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie."
    : "Les étiquettes n'ont pas pu être enregistrées : le site doit être mis à jour. Recharge la page.";

/** The alert at the top of the zone « Étiqueter ». */
export const tagTransitionFailureLabel = ({ kind }: TransitionTaggingFailure): string => {
  switch (kind) {
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau pour étiqueter cette transition.';
    case 'role-withdrawn':
      return 'Tu ne peux plus étiqueter les transitions : ton rôle a changé.';
    case 'unreachable':
    case 'outdated':
      return commonTaggingFailureLabel(kind);
    case 'not-found':
      return "Cette transition n'est plus dans le catalogue. Recharge la page.";
    case 'tags-not-in-list':
      return 'Une étiquette choisie ne fait plus partie de la liste des étiquettes. Vérifie les étiquettes, puis enregistre de nouveau.';
  }
};

/** Texts of the tags of a pose on its page (story 9a, 9a-etiquettes-des-poses.md § 1, zone-etiqueter.md « Variante pose »). */
export const poseTaggingLabels = {
  meanings: 'Ce que veulent dire les étiquettes de la pose',
  tag: 'Étiqueter la pose',
  legend: 'Étiquettes de la pose',
  save: 'Enregistrer les étiquettes',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  saved: 'Étiquettes de la pose enregistrées.',
  loading: 'Chargement des étiquettes…',
  loadingFailed:
    'Impossible de charger la liste des étiquettes. Vérifie ta connexion Internet, puis réessaie.',
  retry: 'Réessayer',
  /** The link of the warning of a pending revision. */
  validationLink: 'Propositions à valider',
} as const;

/** The accessible name of the button: « Étiqueter la pose Folded Leaf ». */
export const tagPoseButtonName = (poseName: string): string => `${poseTaggingLabels.tag} ${poseName}`;

/** The pose cannot be tagged while a revision of it is pending (ADR 0036). */
export const pendingRevisionTaggingLabel = (poseName: string): string =>
  `Une modification de ${poseName} attend déjà d'être validée. Décide d'abord de cette modification, puis étiquette la pose.`;

/** Why the tags of a pose were not recorded, as the zone tells it (a pending revision is told apart). */
export type PoseTaggingFailureKind = {
  readonly kind:
    | 'session-expired'
    | 'role-withdrawn'
    | 'unreachable'
    | 'outdated'
    | 'not-found'
    | 'tags-not-in-list'
    | 'tags-not-applicable'
    | 'revision-pending';
};

/** The alert at the top of the zone « Étiquettes de la pose ». */
export const tagPoseFailureLabel = ({ kind }: PoseTaggingFailureKind): string => {
  switch (kind) {
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau pour étiqueter cette pose.';
    case 'role-withdrawn':
      return 'Tu ne peux plus étiqueter les poses : ton rôle a changé.';
    case 'not-found':
      return "Cette pose n'est plus dans le catalogue. Recharge la page.";
    case 'tags-not-applicable':
      return "Une étiquette choisie ne s'applique plus aux poses. Vérifie les étiquettes, puis enregistre de nouveau.";
    case 'revision-pending':
      return "Une modification de cette pose attend déjà d'être validée. Décide d'abord de cette modification, puis étiquette la pose.";
    case 'tags-not-in-list':
      return 'Une étiquette choisie ne fait plus partie de la liste des étiquettes. Vérifie les étiquettes, puis enregistre de nouveau.';
    case 'unreachable':
    case 'outdated':
      return commonTaggingFailureLabel(kind);
  }
};

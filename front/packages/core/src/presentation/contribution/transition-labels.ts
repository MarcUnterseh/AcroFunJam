import type { DifficultyLevel } from '../../domain/shared-kernel/difficulty-level';
import type { TransitionAdjustment } from '../../domain/contribution/transition-adjustment';
import type { TransitionContentErrorCode } from '../../domain/contribution/transition-proposal';
import { transitionDescriptionPolicy } from '../../domain/shared-kernel/transition-description';
import { transitionNamePolicy } from '../../domain/shared-kernel/transition-name';
import type { TagReference } from '../../domain/shared-kernel/transition-tags';
import { difficultyLevelName } from '../shared-kernel/difficulty-level-labels';
import { tagNamesSentence, transitionTagLabels } from '../shared-kernel/transition-tag-labels';

const nameMaxLength = transitionNamePolicy.maxLength;
const descriptionMaxLength = transitionDescriptionPolicy.maxLength;

/**
 * Presentation: French texts of the form « Proposer une transition » (story 7, informal tone), shared by the web and
 * mobile apps: decisions of the product owner (docs/domain/decouverte.md, story 7) and texts of the design
 * (docs/design/ecrans/7-proposer-une-transition.md), those marked « proposé » kept as proposed.
 */
export const transitionProposalLabels = {
  title: 'Proposer une transition',
  signInContext: 'Connecte-toi pour proposer une transition.',
  publishesDirectly:
    "Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi.",
  introduction: 'Le nom et la description sont facultatifs ; les autres champs sont obligatoires.',
  fromPose: 'Pose de départ',
  toPose: "Pose d'arrivée",
  /** The empty option of the two lists: not disabled, the person may come back to it. */
  choosePose: 'Choisis une pose',
  name: 'Nom de la transition (facultatif)',
  difficultyHelp: 'La difficulté mesure le passage seul : les deux poses sont supposées maîtrisées.',
  baseDifficulty: 'Difficulté base',
  flyerDifficulty: 'Difficulté flyer',
  description: 'Description (facultative)',
  descriptionHelp: `Décris le passage : position de passage, appuis, lien vers une vidéo… Elle sera publiée avec la transition. ${descriptionMaxLength} caractères au maximum.`,
  submit: 'Proposer la transition',
  submitting: 'Envoi de la transition…',
  cancel: 'Annuler',
  loading: 'Chargement des poses…',
  loadingFailed: 'Impossible de charger les poses. Vérifie ta connexion Internet, puis réessaie.',
  loadingOutdated: 'Impossible de charger les poses : le site doit être mis à jour. Recharge la page.',
  notFound: "Cette pose n'est plus dans le catalogue.",
  /** Under a pose of the transition that left the catalog meanwhile. */
  poseNotFound: "Cette pose n'est plus dans le catalogue. Choisis-en une autre.",
  unreachable:
    "Ta transition n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
  outdated:
    "Ta transition n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
  sessionExpired:
    'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta transition : ta saisie est conservée.',
  inputRestored: 'Ta saisie a été restaurée. Tu peux envoyer ta transition.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  reload: 'Recharger la page',
  signIn: 'Se connecter',
  seeCatalog: 'Voir le catalogue',
  /** Label of the description in the cards of the queue and of « Mes propositions » (carte-transition.md). */
  descriptionTitle: 'Description',
} as const;

/**
 * Help of the name (validated): an example of usual name, then how a transition without a name presents itself, by
 * the poses chosen; « Throne → Bird » while one of them is not chosen.
 */
export const transitionNameHelp = ({
  from,
  to,
}: {
  readonly from: string | null;
  readonly to: string | null;
}): string =>
  `Son nom d'usage, par exemple Ninja Star. Sans nom, elle se présentera par ses poses : ${from && to ? `${from} → ${to}` : 'Throne → Bird'}. ${nameMaxLength} caractères au maximum.`;

/** Announced when « Proposer une autre transition depuis Throne » gives a blank form, its title taking the focus. */
export const newTransitionFormAnnouncement = (originPoseName: string): string =>
  `Nouveau formulaire : la pose de départ est ${originPoseName}.`;

/** The title of the document once the transition is sent, from the status returned by the API. */
export const transitionSuccessDocumentTitle = (status: 'pending' | 'published' | 'received'): string =>
  status === 'published' ? 'Transition publiée' : 'Transition envoyée';

/** « Proposer une transition depuis Throne »: the title of the document names the pose of origin. */
export const transitionProposalDocumentTitle = (poseName: string): string =>
  `${transitionProposalLabels.title} depuis ${poseName}`;

const fieldErrors: Readonly<
  Record<
    Exclude<TransitionContentErrorCode, 'transition.name-too-long' | 'transition.description-too-long'>,
    string
  >
> = {
  'contribution.from-pose-required': 'Choisis la pose de départ.',
  'contribution.to-pose-required': "Choisis la pose d'arrivée.",
  'transition.name-without-letter-or-digit': 'Le nom doit contenir au moins une lettre ou un chiffre.',
  'pose.base-difficulty-required': 'Choisis la difficulté base.',
  'pose.flyer-difficulty-required': 'Choisis la difficulté flyer.',
};

/** Message of a field, under the field or the legend of its group; the length of a text too long is stated. */
export const transitionFieldErrorLabel = (
  code: TransitionContentErrorCode,
  { nameLength, descriptionLength }: { readonly nameLength: number; readonly descriptionLength: number },
): string => {
  switch (code) {
    case 'transition.name-too-long':
      return `Le nom ne doit pas dépasser ${nameMaxLength} caractères (il en compte ${nameLength}).`;
    case 'transition.description-too-long':
      return `La description ne doit pas dépasser ${descriptionMaxLength} caractères (elle en compte ${descriptionLength}).`;
    default:
      return fieldErrors[code];
  }
};

/** The place of the transition between its poses is taken: the kinds of TransitionPlaceTaken of core/application. */
export type TransitionPlaceTakenKind =
  | 'transition-name-already-in-catalog'
  | 'transition-name-already-pending'
  | 'unnamed-transition-already-in-catalog'
  | 'unnamed-transition-already-pending';

/**
 * Refusal of the place of the transition by the API, shown under the name (the field to change): a name taken
 * between these poses, or a transition without a name already there, in which case the person names theirs.
 */
export const transitionPlaceTakenLabel = (
  kind: TransitionPlaceTakenKind,
  { from, to }: { readonly from: string; readonly to: string },
): string => {
  switch (kind) {
    case 'transition-name-already-in-catalog':
      return `Une transition de ce nom va déjà de ${from} vers ${to} dans le catalogue. Choisis un autre nom.`;
    case 'transition-name-already-pending':
      return `Une transition de ce nom va déjà de ${from} vers ${to} et attend d'être validée. Choisis un autre nom.`;
    case 'unnamed-transition-already-in-catalog':
      return `Une transition sans nom va déjà de ${from} vers ${to}. Donne un nom à la tienne pour la distinguer.`;
    case 'unnamed-transition-already-pending':
      return `Une transition sans nom va déjà de ${from} vers ${to} et attend d'être validée. Donne un nom à la tienne pour la distinguer.`;
  }
};

/** A transition in a sentence: « « Ninja Star » de Star vers Star », or « de Throne vers Bird » without a name. */
const inASentence = ({ name, from, to }: TransitionTitle): string =>
  // French quotation marks with no-break spaces inside: the name never leaves its marks.
  `${name ? `«\u00a0${name}\u00a0» ` : ''}de ${from} vers ${to}`;

type Outcome = {
  readonly status: 'pending' | 'published' | 'received';
  readonly fromPose: { readonly name: string };
  readonly toPose: { readonly name: string };
  readonly name: string | null;
};

/** Confirmation after sending (panneau-succes.md, « Variante transition »), from the status returned by the API. */
export const transitionProposalSuccess = (
  outcome: Outcome,
): { readonly title: string; readonly text: string | null } => {
  const transition = inASentence({
    name: outcome.name,
    from: outcome.fromPose.name,
    to: outcome.toPose.name,
  });
  switch (outcome.status) {
    case 'pending':
      return {
        title: 'Merci, ta transition est envoyée.',
        text: `La transition ${transition} est en attente de validation. Elle apparaîtra sur la page des deux poses quand un validateur l'aura acceptée.`,
      };
    case 'published':
      return {
        title: `La transition ${transition} est publiée.`,
        text: 'Elle apparaît maintenant sur la page des deux poses.',
      };
    default:
      // Received, but its status cannot be read (a newer API): nothing is promised.
      return { title: 'Ta transition est envoyée.', text: null };
  }
};

export type TransitionSuccessAction = {
  readonly action: 'see-my-proposals' | 'propose-another' | 'see-pose';
  readonly label: string;
};

/**
 * The ways out after sending, in the validated order, all of the same weight: a user follows what was sent; a
 * validator, whose transition is published, sees it on the page of the pose of origin (decision 11, Q23).
 */
export const transitionSuccessActions = (
  status: Outcome['status'],
  originPoseName: string,
): readonly TransitionSuccessAction[] => {
  const proposeAnother: TransitionSuccessAction = {
    action: 'propose-another',
    label: `Proposer une autre transition depuis ${originPoseName}`,
  };
  return status === 'published'
    ? [{ action: 'see-pose', label: `Voir la pose ${originPoseName}` }, proposeAnother]
    : [
        { action: 'see-my-proposals', label: 'Voir mes propositions' },
        proposeAnother,
        { action: 'see-pose', label: `Revenir à ${originPoseName}` },
      ];
};

/** A transition as titled: its name (null without one) and the current names of its poses. */
export type TransitionTitle = { readonly name: string | null; readonly from: string; readonly to: string };

/** A part of a title: the names are emphasised, the linking words are not (carte-transition.md). */
export type TitlePart = { readonly text: string; readonly emphasised: boolean };

/**
 * Title of the card of a transition proposal, in the validation queue and in « Mes propositions »: « Transition
 * Ninja Star de Star vers Star », or « Transition de Throne vers Bird » without a name (no arrow: the sentence says it).
 */
export const transitionCardTitle = ({ name, from, to }: TransitionTitle): readonly TitlePart[] => [
  ...(name
    ? [
        { text: 'Transition ', emphasised: false },
        { text: name, emphasised: true },
        { text: ' de ', emphasised: false },
      ]
    : [{ text: 'Transition de ', emphasised: false }]),
  { text: from, emphasised: true },
  { text: ' vers ', emphasised: false },
  { text: to, emphasised: true },
];

/** The counter appears near the limit only (champ.md, zone de texte). */
const descriptionCounterThreshold = 450;

/** Counter under the description, counted once normalised; null while far from the limit. */
export const descriptionCounterLabel = (length: number): string | null => {
  if (length < descriptionCounterThreshold) return null;
  const counter = `${length} / ${descriptionMaxLength} caractères`;
  return length > descriptionMaxLength ? `${counter} : ${length - descriptionMaxLength} de trop` : counter;
};

/** A value of a transition and its field, as the adjustment zone and the summaries display it. */
export type TransitionFieldValue =
  | { readonly field: 'name'; readonly value: string | null }
  | { readonly field: 'baseDifficulty' | 'flyerDifficulty'; readonly value: DifficultyLevel }
  | { readonly field: 'tags'; readonly value: readonly TagReference[] }
  | { readonly field: 'description'; readonly value: string | null };

const displayed = (value: TransitionFieldValue): string => {
  switch (value.field) {
    case 'name':
      // « aucun nom » in words on both sides of the arrow (carte-transition.md).
      return value.value ?? 'aucun nom';
    case 'description':
      return value.value ?? 'aucune description';
    case 'tags':
      return tagNamesSentence(value.value);
    default:
      return difficultyLevelName(value.value);
  }
};

const terms: Readonly<Record<TransitionFieldValue['field'], string>> = {
  name: 'Nom de la transition',
  baseDifficulty: 'Difficulté base',
  flyerDifficulty: 'Difficulté flyer',
  tags: transitionTagLabels.adjustmentTerm,
  description: 'Description',
};

/** A line of the summary « proposé → retenu » of a transition (recapitulatif-ajustements.md). */
export const transitionAdjustmentLine = (
  adjustment: TransitionAdjustment,
): { readonly term: string; readonly proposed: string; readonly retained: string } => ({
  term: terms[adjustment.field],
  proposed: displayed({ field: adjustment.field, value: adjustment.proposed } as TransitionFieldValue),
  retained: displayed({ field: adjustment.field, value: adjustment.retained } as TransitionFieldValue),
});

/** « Proposé : Ninja Star », « Proposée : aucune description »: reminder under each field of the adjustment zone. */
export const proposedTransitionValueLabel = (proposed: TransitionFieldValue): string =>
  `${proposed.field === 'name' ? 'Proposé' : 'Proposée'} : ${displayed(proposed)}`;

/** A decision on a transition: accepted (adjusted or not) or rejected. */
export type TransitionDecision = { readonly transition: TransitionTitle } & (
  { readonly decision: 'accepted'; readonly adjusted: boolean } | { readonly decision: 'rejected' }
);

/** A decision on a transition recorded by the API, as the report that replaces its card presents it. */
export type RecordedTransitionDecision = { readonly proposal: 'transition-proposal' } & TransitionDecision;

/** Report of a decision on a transition (compte-rendu-decision.md): its retained name, its poses. */
export const transitionDecisionReport = (
  recorded: TransitionDecision,
): { readonly title: string; readonly text: string | null } => {
  const transition = inASentence(recorded.transition);
  if (recorded.decision === 'rejected')
    return {
      title: `La proposition de la transition ${transition} est refusée.`,
      text: 'Le contributeur verra ton motif.',
    };
  return {
    title: `La transition ${transition} est publiée dans le catalogue${recorded.adjusted ? ' avec tes ajustements' : ''}.`,
    text: null,
  };
};

/** Refusal of the retained name of a transition by the API, under the name of the adjustment zone. */
export const adjustedTransitionNameRefusalLabel = (kind: TransitionPlaceTakenKind): string => {
  switch (kind) {
    case 'transition-name-already-in-catalog':
      return 'Une transition de ce nom relie déjà ces poses dans le catalogue. Choisis un autre nom.';
    case 'transition-name-already-pending':
      return "Une autre transition de ce nom entre ces poses attend d'être validée. Choisis un autre nom.";
    case 'unnamed-transition-already-in-catalog':
      return 'Une transition sans nom relie déjà ces poses dans le catalogue. Donne un nom à celle-ci.';
    case 'unnamed-transition-already-pending':
      return "Une autre transition sans nom entre ces poses attend d'être validée. Donne un nom à celle-ci.";
  }
};

import type { AdjustmentNoteError } from '../../domain/contribution/adjustment-note';
import type { PoseAdjustment } from '../../domain/contribution/pose-adjustment';
import type { PoseValueChange } from '../../domain/contribution/pose-revision';
import type { ValidPoseProposal } from '../../domain/contribution/pose-proposal';
import type { RejectionReasonError } from '../../domain/contribution/rejection-reason';
import { validatorTextPolicy } from '../../domain/contribution/proposal-text';
import { dayLabel } from '../shared-kernel/date-labels';
import { difficultyLevelName } from '../shared-kernel/difficulty-level-labels';
import { proposalLabels } from './proposal-labels';

const { maxLength } = validatorTextPolicy;

/**
 * Presentation: French texts of the page « Propositions à valider » (story 4), shared by the web and mobile apps:
 * recommendations of the ux-expert kept by the product owner (docs/design/ecrans/4-valider-une-proposition.md and
 * the components it references); the texts marked « proposé » there are to be confirmed. At the screen, one says
 * « Propositions à valider », never « valider une figure » (in acroyoga: succeed in it).
 */
export const validationLabels = {
  navigation: 'Contribution',
  title: 'Propositions à valider',
  /** Visible label of the header link under 1024 px; the accessible name stays complete (validationLinkName). */
  shortTitle: 'À valider',
  signInContext: 'Connecte-toi pour accéder aux propositions à valider.',
  introduction:
    "Vérifie chaque proposition de pose, de modification ou de transition : accepte-la, ajuste-la avant de l'accepter ou refuse-la.",
  loading: 'Chargement des propositions…',
  loadingFailed: 'Impossible de charger les propositions. Vérifie ta connexion Internet, puis réessaie.',
  loadingOutdated: 'Impossible de charger les propositions : le site doit être mis à jour. Recharge la page.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  emptyTitle: "Aucune proposition n'est en attente de validation.",
  emptyText: 'Tu es à jour.',
  seeCatalog: 'Voir le catalogue',
  backToCatalog: 'Revenir au catalogue',
  signIn: 'Se connecter',
  reload: 'Recharger la page',
  // Decisions, in the order of the card: from « as proposed » to « no ».
  accept: 'Accepter et publier',
  adjust: 'Ajuster avant de publier',
  reject: 'Refuser',
  publishing: 'Publication…',
  // Rejection zone.
  reason: 'Motif du refus',
  reasonHelp: `Le contributeur verra ce motif. ${maxLength} caractères au maximum.`,
  confirmRejection: 'Confirmer le refus',
  rejecting: 'Refus en cours…',
  cancel: 'Annuler',
  // Adjustment zone, then summary « proposé → retenu » (Q17).
  adjustTitle: 'Ajuster avant de publier',
  adjustIntroduction: 'Les valeurs proposées sont préremplies.',
  checkAdjustments: 'Vérifier les ajustements',
  nothingAdjusted: "Tu n'as rien modifié. Tu peux accepter la proposition telle quelle.",
  summaryTitle: 'Vérifie tes ajustements',
  summaryKey: 'Valeur proposée → valeur retenue',
  /** Text read before the proposed value and the retained value (the arrow is hidden from assistive technologies). */
  summaryProposed: 'Proposé : ',
  summaryRetained: ', retenu : ',
  summaryRest: 'Les autres valeurs restent celles proposées.',
  note: 'Message pour le contributeur (facultatif)',
  noteHelp: `Il le verra avec tes ajustements. ${maxLength} caractères au maximum.`,
  publishAdjusted: 'Publier avec ces ajustements',
  editAdjustments: 'Modifier les ajustements',
  /** Announced when the input kept in the tab (ADR 0019) is given back, after signing in again. */
  inputRestored: 'Ta saisie a été restaurée. Tu peux envoyer ta décision.',
  /** Announced when an input kept in the tab was for a proposal no longer in the queue (decided meanwhile). */
  keptInputDecided: 'Une proposition sur laquelle tu avais commencé une décision a été traitée entre-temps.',
  /** Under the title, once every proposal of the list is decided (their reports stay until the page is reloaded). */
  allDecided: 'Toutes les propositions de la liste sont traitées.',
} as const;

/** Which kind of proposal a card or a report is about: a pose, a revision (story 6) or a transition (story 7). */
export type ProposalKind = 'pose-proposal' | 'pose-revision' | 'transition-proposal';

/**
 * Card of a revision proposal (docs/design/composants/carte-modification.md): its title « Modification de Throne »
 * (the prefix in regular weight), the summary « actuellement → proposé » of the changed fields, the message of the
 * contributor, then the pose as it will be once accepted.
 */
export const revisionCardLabels = {
  titlePrefix: 'Modification de ',
  changesTitle: 'Ce qui change dans la pose',
  changesKey: 'Valeur actuelle → valeur proposée',
  /** Visually hidden texts read before the current value and the proposed value. */
  before: 'Actuellement : ',
  after: ', proposé : ',
  message: 'Message de modification',
  revisedPose: 'La pose après modification',
} as const;

/** The decisions of a card, named by the kind of proposal: one publishes a pose, or accepts a modification. */
export const decisionLabelsOf = (
  kind: ProposalKind,
): {
  readonly accept: string;
  readonly adjust: string;
  readonly adjustTitle: string;
  readonly publishAdjusted: string;
  readonly nothingAdjusted: string;
} =>
  kind === 'pose-revision'
    ? {
        accept: 'Accepter la modification',
        adjust: "Ajuster avant d'accepter",
        adjustTitle: "Ajuster avant d'accepter",
        publishAdjusted: 'Accepter avec ces ajustements',
        nothingAdjusted: "Tu n'as rien modifié. Tu peux accepter la modification telle quelle.",
      }
    : {
        accept: validationLabels.accept,
        adjust: validationLabels.adjust,
        adjustTitle: validationLabels.adjustTitle,
        publishAdjusted: validationLabels.publishAdjusted,
        nothingAdjusted: validationLabels.nothingAdjusted,
      };

/** Beyond this number, the badge shows « 99+ » (docs/design/composants/pastille-compteur.md). */
const badgeLimit = 99;

/**
 * Accessible name of the header link « Propositions à valider », with the number of pending proposals: none at 0
 * or while the number is unknown (loading, failure).
 */
export const validationLinkName = (count: number | null): string => {
  const suffix = pendingCountSuffix(count);
  return suffix ? `${validationLabels.title} ${suffix}` : validationLabels.title;
};

/** « (3 en attente) »: the rest of the accessible name of the header link, after its title; empty at 0 or unknown. */
export const pendingCountSuffix = (count: number | null): string => {
  if (!count) return '';
  return `(${count > badgeLimit ? `plus de ${badgeLimit}` : `${count}`} en attente)`;
};

/** Number shown in the badge of the header link; null: no badge (none pending, or unknown). */
export const pendingBadge = (count: number | null): string | null => {
  if (!count) return null;
  return count > badgeLimit ? `${badgeLimit}+` : `${count}`;
};

/**
 * Under the title of the page, once the queue is received, less the proposals decided since. 0: every proposal of
 * the list is decided (an empty queue, on arrival, has its own block).
 */
export const pendingCountLabel = (count: number): string => {
  if (count === 0) return validationLabels.allDecided;
  return count === 1
    ? '1 proposition en attente'
    : `${count} propositions en attente, de la plus ancienne à la plus récente`;
};

/**
 * Line under the name of a proposal: « Proposée par alice@example.org le 3 novembre 2026 », « toi » for the
 * validator's own proposal (decision of 2026-11-04). In three parts: the contributor is emphasised by the apps.
 */
export const contributorLine = (
  contributor: { readonly email: string | null; readonly isYou: boolean },
  submittedAt: Date,
): { readonly before: string; readonly contributor: string; readonly after: string } => ({
  before: 'Proposée par ',
  // An account deleted since (Q11, still open): no address to show.
  contributor: contributor.isYou ? 'toi' : (contributor.email ?? 'un compte supprimé'),
  after: ` le ${dayLabel(submittedAt)}`,
});

/** A decision on a pose or a revision recorded by the API, as the report that replaces its card presents it. */
export type RecordedDecision = { readonly proposal: 'pose-proposal' | 'pose-revision' } & (
  | { readonly decision: 'accepted'; readonly name: string; readonly adjusted: boolean }
  | { readonly decision: 'rejected'; readonly name: string }
);

/**
 * Report of a decision (docs/design/composants/compte-rendu-decision.md): success for a publication or a
 * modification, information for a rejection. The name of an accepted pose is the retained name, as returned by
 * the API (the new name of a renamed pose).
 */
export const decisionReport = (
  recorded: RecordedDecision,
): { readonly title: string; readonly text: string | null } => {
  const revision = recorded.proposal === 'pose-revision';
  if (recorded.decision === 'rejected')
    return {
      title: revision
        ? `La modification de « ${recorded.name} » est refusée.`
        : `La proposition « ${recorded.name} » est refusée.`,
      text: 'Le contributeur verra ton motif.',
    };
  const adjustments = recorded.adjusted ? ' avec tes ajustements' : '';
  const outcome = revision ? 'modifiée' : 'publiée';
  return {
    title: `La pose « ${recorded.name} » est ${outcome} dans le catalogue${adjustments}.`,
    text: null,
  };
};

/**
 * Why a decision was not recorded: the kinds of DecisionError of core/application, written again here because
 * the presentation depends on the domain only (ADR 0021). Keep both in step: a kind added to DecisionError['kind']
 * needs its label here (the apps pass one to the other, so the compiler tells a missing kind).
 */
export type DecisionFailureKind =
  | 'unreachable'
  | 'session-expired'
  | 'outdated'
  | 'already-decided'
  | 'not-found'
  | 'role-withdrawn'
  | 'name-already-in-catalog'
  | 'name-already-pending'
  | 'retained-revision-changes-nothing'
  | 'pose-changed'
  | 'transition-name-already-in-catalog'
  | 'transition-name-already-pending'
  | 'unnamed-transition-already-in-catalog'
  | 'unnamed-transition-already-pending'
  | 'transition-pose-not-found'
  | 'tags-not-in-list';

const nameRefusals = {
  'name-already-in-catalog': 'Une pose de ce nom existe déjà dans le catalogue.',
  'name-already-pending': "Une autre proposition de ce nom attend d'être validée.",
} as const;

const nameAdvice = "Ajuste le nom avant de publier, ou refuse la proposition si c'est un doublon.";
const unnamedAdvice = "Donne un nom à celle-ci avant de la publier, ou refuse-la si c'est un doublon.";

const decisionFailures: Readonly<Record<DecisionFailureKind, string>> = {
  unreachable:
    "Ta décision n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.",
  'session-expired': 'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta décision.',
  outdated:
    "Ta décision n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie.",
  // Not « by another validator »: the first decision may be the validator's own, sent before an outage.
  'already-decided': 'Cette proposition a déjà été traitée.',
  'not-found': "Cette proposition n'est plus en attente de validation.",
  'role-withdrawn': 'Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé.',
  'name-already-in-catalog': `${nameRefusals['name-already-in-catalog']} ${nameAdvice}`,
  'name-already-pending': `${nameRefusals['name-already-pending']} ${nameAdvice}`,
  'retained-revision-changes-nothing':
    'Avec ces ajustements, la pose ne changerait pas. Modifie tes ajustements, ou refuse la modification.',
  'pose-changed':
    'Cette pose a changé depuis que la modification a été proposée. Recharge la page pour voir ses valeurs actuelles.',
  // Story 7: the place of a transition between its poses, in this direction, is taken.
  'transition-name-already-in-catalog': `Une transition de ce nom relie déjà ces poses dans le catalogue. ${nameAdvice}`,
  'transition-name-already-pending': `Une autre transition de ce nom entre ces poses attend d'être validée. ${nameAdvice}`,
  'unnamed-transition-already-in-catalog': `Une transition sans nom relie déjà ces poses dans le catalogue. ${unnamedAdvice}`,
  'unnamed-transition-already-pending': `Une autre transition sans nom entre ces poses attend d'être validée. ${unnamedAdvice}`,
  'transition-pose-not-found':
    "Une des poses de cette transition n'est plus dans le catalogue : la transition ne peut pas être publiée. Refuse la proposition.",
  // Story 8: a retained tag left the list of tags meanwhile.
  'tags-not-in-list':
    'Une étiquette retenue ne fait plus partie de la liste des étiquettes. Vérifie les étiquettes, puis publie de nouveau.',
};

/** The same incidents, when the validator had typed something (an open zone): the input is kept (ADR 0019). */
const withKeptInput: Readonly<Partial<Record<DecisionFailureKind, string>>> = {
  unreachable: `${decisionFailures.unreachable} Ta saisie est conservée.`,
  'session-expired':
    'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta décision : ta saisie est conservée.',
  outdated: `${decisionFailures.outdated} Ta saisie est conservée.`,
};

/**
 * Alert in the card of the proposal (docs/design/composants/carte-proposition.md, « Alertes dans la carte »). The
 * input is said to be kept only when there is one: a zone of the card was open (reason, adjustments).
 */
export const decisionFailureLabel = (
  kind: DecisionFailureKind,
  { inputKept = false }: { readonly inputKept?: boolean } = {},
): string => (inputKept ? withKeptInput[kind] : undefined) ?? decisionFailures[kind];

/** Error under the field « Motif du refus » or « Message pour le contributeur »; the length is stated. */
export const validatorTextErrorLabel = (
  code: RejectionReasonError | AdjustmentNoteError,
  length: number,
): string => {
  switch (code) {
    case 'contribution.rejection-reason-required':
      return 'Saisis le motif du refus.';
    case 'contribution.rejection-reason-too-long':
      return `Le motif ne doit pas dépasser ${maxLength} caractères (il en compte ${length}).`;
    case 'contribution.adjustment-note-too-long':
      return `Le message ne doit pas dépasser ${maxLength} caractères (il en compte ${length}).`;
  }
};

/** Refusal of the retained name by the API, under the field « Nom de la pose » of the adjustment form. */
export const adjustedNameRefusalLabel = (kind: 'name-already-in-catalog' | 'name-already-pending'): string =>
  `${nameRefusals[kind]} Choisis un autre nom.`;

/** The counter appears near the limit only (docs/design/composants/champ.md, zone de texte). */
const counterThreshold = 450;

/** Counter under the reason or the message, counted once normalised; null while far from the limit. */
export const validatorTextCounterLabel = (length: number): string | null => {
  if (length < counterThreshold) return null;
  const counter = `${length} / ${maxLength} caractères`;
  return length > maxLength ? `${counter} : ${length - maxLength} de trop` : counter;
};

/** The values of a pose, as displayed (the name needs not be checked to be shown). */
type PoseValues = Omit<ValidPoseProposal, 'name'> & { readonly name: string };

/** A value of a pose and its field (the values of a pose adjustment). */
export type PoseFieldValue = {
  [F in keyof PoseValues]: { readonly field: F; readonly value: PoseValues[F] };
}[keyof PoseValues];

const displayed = ({ field, value }: PoseFieldValue): string => {
  switch (field) {
    case 'name':
      return value;
    case 'baseDifficulty':
    case 'flyerDifficulty':
      return difficultyLevelName(value);
    // Story 9a: the tags, in catalog order, or « aucune ».
    case 'tags':
      return value.length === 0 ? 'aucune' : value.map((tag) => tag.name).join(', ');
    default:
      return value ? proposalLabels.yes : proposalLabels.no;
  }
};

/** « Proposé : Thron », « Proposée : Débutant »: reminder under each field of the adjustment form. */
export const proposedValueLabel = (proposed: PoseFieldValue): string => {
  const isDifficulty = proposed.field === 'baseDifficulty' || proposed.field === 'flyerDifficulty';
  if (proposed.field === 'tags') return `Proposées : ${displayed(proposed)}`;
  return `${isDifficulty ? 'Proposée' : 'Proposé'} : ${displayed(proposed)}`;
};

/** « Actuellement : Débutant »: reminder of the current value of a field of a pose (story 6). */
export const currentValueLabel = (current: PoseFieldValue): string => `Actuellement : ${displayed(current)}`;

/** Terms of the summary, read out of the card (« Base » becomes « Difficulté base »). */
const adjustmentTerms: Readonly<Record<keyof PoseValues, string>> = {
  name: 'Nom de la pose',
  baseDifficulty: 'Difficulté base',
  flyerDifficulty: 'Difficulté flyer',
  canStartFlow: 'Peut commencer un flow',
  canEndFlow: 'Peut terminer un flow',
  tags: 'Étiquettes',
};

/**
 * A line of a summary « avant → après » (docs/design/composants/recapitulatif-modification.md): the term of the
 * field, its value before and after, as displayed.
 */
export const valueChangeLine = (
  change: PoseValueChange,
): { readonly term: string; readonly before: string; readonly after: string } => ({
  term: adjustmentTerms[change.field],
  before: displayed({ field: change.field, value: change.before } as PoseFieldValue),
  after: displayed({ field: change.field, value: change.after } as PoseFieldValue),
});

/** A line of the summary « proposé → retenu » (docs/design/composants/recapitulatif-ajustements.md). */
export const adjustmentLine = (
  adjustment: PoseAdjustment,
): { readonly term: string; readonly proposed: string; readonly retained: string } => {
  const { term, before, after } = valueChangeLine({
    field: adjustment.field,
    before: adjustment.proposed,
    after: adjustment.retained,
  } as PoseValueChange);
  return { term, proposed: before, retained: after };
};

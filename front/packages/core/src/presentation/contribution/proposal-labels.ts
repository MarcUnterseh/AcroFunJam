import type { PoseContentErrorCode } from '../../domain/contribution/pose-proposal';
import { poseNamePolicy } from '../../domain/shared-kernel/pose-name';

const { maxLength } = poseNamePolicy;

/**
 * Presentation: French texts of the form « Proposer une pose » (informal tone, docs/design/principes.md,
 * validated in docs/design/ecrans/3-proposer-une-pose.md), shared by the web and mobile apps.
 * « Irrecevable » is never shown.
 */
export const proposalLabels = {
  title: 'Proposer une pose',
  signInContext: 'Connecte-toi pour proposer une pose.',
  introduction: 'Tous les champs sont obligatoires.',
  publishesDirectly:
    "Ton rôle te permet de publier directement : la pose apparaîtra dans le catalogue dès l'envoi.",
  name: 'Nom de la pose',
  nameHelp: `Le nom usuel de la pose, par exemple Throne ou High Bird. ${maxLength} caractères au maximum.`,
  baseDifficulty: 'Difficulté base',
  flyerDifficulty: 'Difficulté flyer',
  startFlowHelp: "Peut commencer : le duo s'installe dans la pose directement depuis le sol.",
  endFlowHelp: 'Peut terminer : le flyer redescend au sol directement et sans danger.',
  canStartFlow: 'Peut-on commencer un flow sur cette pose ?',
  canEndFlow: 'Peut-on terminer un flow sur cette pose ?',
  yes: 'Oui',
  no: 'Non',
  submit: 'Proposer la pose',
  submitting: 'Envoi de la proposition…',
  unreachable:
    "Ta proposition n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
  retry: 'Réessayer',
  outdated:
    "Ta proposition n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
  reload: 'Recharger la page',
  sessionExpired:
    'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta proposition : ta saisie est conservée.',
  signIn: 'Se connecter',
  inputRestored: 'Ta saisie a été restaurée. Tu peux envoyer ta proposition.',
  proposeAnother: 'Proposer une autre pose',
  seeCatalog: 'Voir le catalogue',
} as const;

const fieldErrors: Readonly<Record<Exclude<PoseContentErrorCode, 'pose.name-too-long'>, string>> = {
  'pose.name-required': 'Saisis le nom de la pose.',
  'pose.base-difficulty-required': 'Choisis la difficulté base.',
  'pose.flyer-difficulty-required': 'Choisis la difficulté flyer.',
  'pose.can-start-flow-required': 'Indique si un flow peut commencer sur cette pose.',
  'pose.can-end-flow-required': 'Indique si un flow peut terminer sur cette pose.',
};

/** Message of a field, under the field or the legend of its group; the length of the name is stated. */
export const proposalFieldErrorLabel = (code: PoseContentErrorCode, nameLength: number): string =>
  code === 'pose.name-too-long'
    ? `Le nom ne doit pas dépasser ${maxLength} caractères (il en compte ${nameLength}).`
    : fieldErrors[code];

const refusals = {
  'name-already-in-catalog':
    'Une pose de ce nom existe déjà dans le catalogue. Choisis un autre nom : une variante a son propre nom, par exemple High Bird.',
  'name-already-pending': "Une pose de ce nom a déjà été proposée et attend d'être validée.",
} as const;

/** Refusal of the name by the API, shown as an error of the field « Nom de la pose ». */
export const proposalRefusalLabel = (kind: keyof typeof refusals): string => refusals[kind];

/** The counter appears near the limit only. */
const counterThreshold = 50;

/** Counter under the name, counted after removing the superfluous spaces; null while far from the limit. */
export const nameCounterLabel = (length: number): string | null => {
  if (length < counterThreshold) return null;
  const counter = `${length} / ${maxLength} caractères`;
  return length > maxLength ? `${counter} : ${length - maxLength} de trop` : counter;
};

/** Confirmation after sending, from the status returned by the API (never from the supposed role). */
export const proposalSuccess = (outcome: {
  readonly status: 'pending' | 'published' | 'received';
  readonly name: string;
}): { readonly title: string; readonly text: string | null } => {
  switch (outcome.status) {
    case 'published':
      return {
        title: `La pose « ${outcome.name} » est publiée.`,
        text: 'Elle apparaît maintenant dans le catalogue.',
      };
    case 'pending':
      return {
        title: 'Merci, ta proposition est envoyée.',
        text: `La pose « ${outcome.name} » est en attente de validation. Elle apparaîtra dans le catalogue quand un validateur l'aura acceptée.`,
      };
    default:
      // Received, but its status cannot be read (a newer API): nothing is promised.
      return { title: 'Ta proposition est envoyée.', text: null };
  }
};

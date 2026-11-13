import { validatorTextPolicy } from '../../domain/contribution/proposal-text';
import { poseNamePolicy } from '../../domain/shared-kernel/pose-name';

const messageMaxLength = validatorTextPolicy.maxLength;

/**
 * Presentation: French texts of the form « Proposer une modification » (story 6, informal tone), shared by the web
 * and mobile apps: decisions of the product owner (docs/domain/decouverte.md, story 6) and texts validated by the
 * ux-expert (docs/design/ecrans/6-proposer-une-modification.md). On the site, a revised pose is « modifiée ».
 */
export const revisionLabels = {
  title: 'Proposer une modification',
  signInContext: 'Connecte-toi pour proposer une modification.',
  /** « Pose : Throne », under the title; the name is emphasised by the apps. */
  poseLine: 'Pose : ',
  loading: 'Chargement de la pose…',
  publishesDirectly:
    'Ton rôle te permet de publier directement : la pose sera modifiée dans le catalogue dès que tu publieras ta modification.',
  introduction: "Change seulement ce qui doit l'être. La valeur actuelle est rappelée pour chaque champ.",
  /** Second help of the name, after « Actuellement : … ». */
  nameHelp: `${poseNamePolicy.maxLength} caractères au maximum.`,
  /** Tag of a field whose value differs from the current one (etiquette-modifiee.md). */
  modified: 'Modifiée',
  message: 'Message pour le validateur (facultatif)',
  messageHelp: `Explique-lui pourquoi tu proposes cette modification. ${messageMaxLength} caractères au maximum.`,
  submit: 'Proposer la modification',
  submitting: 'Envoi de la modification…',
  /** A validator or an administrator checks the summary before publishing directly. */
  check: 'Vérifier la modification',
  cancel: 'Annuler',
  summaryTitle: 'Vérifie ta modification',
  summaryKey: 'Valeur actuelle → nouvelle valeur',
  /** Visually hidden texts read before the current value and the new value. */
  summaryBefore: 'Actuellement : ',
  summaryAfter: ', nouveau : ',
  summaryRest: 'Les autres valeurs restent inchangées.',
  publish: 'Publier la modification',
  publishing: 'Publication…',
  backToForm: 'Revenir au formulaire',
  // Why a revision is not received, or cannot be proposed.
  changesNothing: "Tu n'as rien modifié. Change au moins une valeur pour proposer une modification.",
  poseChanged:
    'Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau.',
  notFound: "Cette pose n'est plus dans le catalogue.",
  pendingByYou: 'Tu as déjà proposé une modification de cette pose. Elle est en attente de validation.',
  pendingBySomeoneElse:
    "Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée.",
  unreachable:
    "Ta modification n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. Ta saisie est conservée.",
  outdated:
    "Ta modification n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis réessaie. Ta saisie est conservée.",
  sessionExpired:
    'Ta session a expiré. Connecte-toi de nouveau pour envoyer ta modification : ta saisie est conservée.',
  loadingFailed: 'Impossible de charger la pose. Vérifie ta connexion Internet, puis réessaie.',
  loadingOutdated: 'Impossible de charger la pose : le site doit être mis à jour. Recharge la page.',
  inputRestored: 'Ta saisie a été restaurée. Tu peux envoyer ta modification.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  reload: 'Recharger la page',
  signIn: 'Se connecter',
  seeCatalog: 'Voir le catalogue',
} as const;

/** « Proposer une modification de Throne »: the title of the document names the pose. */
export const revisionDocumentTitle = (name: string): string => `${revisionLabels.title} de ${name}`;

const nameRefusals = {
  'name-already-in-catalog': 'Une pose de ce nom existe déjà dans le catalogue.',
  'name-already-pending': "Une pose de ce nom a déjà été proposée et attend d'être validée.",
} as const;

/** Refusal of the new name by the API, shown as an error of the field « Nom de la pose ». */
export const revisionNameRefusalLabel = (kind: keyof typeof nameRefusals): string => nameRefusals[kind];

/** Error under the message for the validator; the length is stated. */
export const revisionMessageErrorLabel = (length: number): string =>
  `Le message ne doit pas dépasser ${messageMaxLength} caractères (il en compte ${length}).`;

/** Confirmation after sending (panneau-succes.md, variante modification), from the status returned by the API. */
export const revisionSuccess = (outcome: {
  readonly status: 'pending' | 'published' | 'received';
  readonly name: string;
}): { readonly title: string; readonly text: string | null } => {
  switch (outcome.status) {
    case 'pending':
      return {
        title: 'Merci, ta modification est envoyée.',
        text: "Un validateur va l'examiner. La pose changera dans le catalogue une fois la modification acceptée.",
      };
    case 'published':
      return { title: `La pose « ${outcome.name} » est modifiée dans le catalogue.`, text: null };
    default:
      // Received, but its status cannot be read (a newer API): nothing is promised.
      return { title: 'Ta modification est envoyée.', text: null };
  }
};

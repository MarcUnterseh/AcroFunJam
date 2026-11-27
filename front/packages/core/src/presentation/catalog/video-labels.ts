import {
  maxVideoSeconds,
  maxVideosPerTransition,
  minVideoMs,
  minVideoShortSide,
  type VideoDimensions,
} from '../../domain/catalog/transition-videos';

// Story 12 « Vidéos des transitions » (UX-47 to UX-59, decouverte.md, docs/design/ecrans/12-videos-des-transitions.md):
// the texts of the videos, shared by the site and the application (ADR 0021). Never « clip », « média », « miniature »,
// « supprimer », « sans son » (UX-56).

// The French typography (G1): a narrow no-break space before ; : ? !, a no-break space inside « » and around ×, a
// non-breaking hyphen in « choisis-la », « retire-la », « envoie-la »: a line never starts with a punctuation mark.
/** The narrow no-break space, before ; : ? ! */
const narrowSpace = '\u202f';
/** The no-break space, inside « » and around ×. */
const noBreakSpace = '\u00a0';
/** The non-breaking hyphen. */
const noBreakHyphen = '\u2011';
const quoted = (text: string) => `«${noBreakSpace}${text}${noBreakSpace}»`;
/** « Vidéo : Léa Martin »: what precedes the colon, the colon, what follows it. */
const colon = (before: string, after: string) => `${before}${narrowSpace}: ${after}`;

/** « la transition de Bird vers Star » opens a sentence with a capital; a name is kept as it is. */
const atSentenceStart = (text: string) => text.replace(/^la /, 'La ');

/**
 * How the labels of the videos name a transition: its name, or « la transition de Throne vers Bird » for an unnamed one,
 * so that « Ajouter une vidéo à … » and « Retirer cette vidéo de … » read well (UX, story 12).
 */
export const videoTransitionName = ({
  name,
  from,
  to,
}: {
  readonly name: string | null;
  readonly from: string;
  readonly to: string;
}): string => name ?? `la transition de ${from} vers ${to}`;

const tooLongEnd = `Raccourcis-la sur ton appareil, puis choisis${noBreakHyphen}la de nouveau.`;

export const transitionVideoLabels = {
  // The block « Vidéos » of a transition (rangee-videos.md).
  title: 'Vidéos',
  /** Completes the title for the assistive technologies: « Vidéos de Pop to Bird ». */
  titleOf: (transition: string) => `de ${transition}`,
  reminder: `Une vidéo montre une façon de faire${narrowSpace}; elle ne remplace ni un cours ni un spotter.`,
  play: 'Lire',
  descriptionSummary: 'Description',
  /** Completes the fold for the assistive technologies: « Description de la vidéo Pop to Bird, tutoriel ». */
  descriptionSummaryOf: (caption: string) => `de la vidéo ${caption}`,
  close: 'Fermer la vidéo',
  closeName: (caption: string) => `Fermer la vidéo ${caption}`,
  playbackFailed: "La vidéo n'a pas pu être lue. Vérifie ta connexion Internet, puis réessaie.",
  retry: 'Réessayer',
  // The preparation (UX-52, UX-59), for the validators and the administrators.
  inPreparation: 'En préparation',
  failed: 'Impossible à préparer',
  preparationFailed: (caption: string) =>
    `La vidéo ${quoted(caption)} n'a pas pu être préparée. Retire${noBreakHyphen}la, puis envoie${noBreakHyphen}la de nouveau ou choisis-en une autre.`,
  prepared: (caption: string) => `La vidéo ${quoted(caption)} est prête.`,
  /** Under the row, once the page stops following a preparation (15 minutes, UX-52). */
  preparationTakesLong:
    'La préparation prend plus de temps que prévu. Recharge la page plus tard pour voir si la vidéo est prête.',
  // The footer of management of the transition.
  addVideo: 'Ajouter une vidéo',
  addVideoName: (transition: string) => `Ajouter une vidéo à ${transition}`,
  maximumReached: (transition: string) =>
    `${atSentenceStart(transition)} a déjà ${maxVideosPerTransition} vidéos, le maximum. Retire une vidéo pour en ajouter une autre.`,
  // Managing a video, under it.
  correct: 'Modifier',
  correctName: (caption: string) => `Modifier ${caption}`,
  correctTitle: 'Modifier la vidéo',
  save: 'Enregistrer la vidéo',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  remove: 'Retirer',
  removeName: (caption: string) => `Retirer ${caption}`,
  removeQuestion: (transition: string) => `Retirer cette vidéo de ${transition}${narrowSpace}?`,
  removeConfirm: 'Retirer la vidéo',
  removing: 'Retrait…',
  // Announcements.
  added: (transition: string) => `Vidéo ajoutée à ${transition}. Elle sera présentée dès qu'elle sera prête.`,
  removed: (transition: string) => `Vidéo retirée de ${transition}.`,
  corrected: 'Vidéo enregistrée.',
  // The page « Ajouter une vidéo à Pop to Bird ».
  addPageTitle: (transition: string) => `Ajouter une vidéo à ${transition}`,
  back: 'Retour',
  transitionNotFound: "Cette transition n'est plus dans le catalogue.",
  allFieldsRequired: 'Tous les champs sont obligatoires, sauf la description de la vidéo.',
  video: 'Vidéo',
  videoHelp: `MP4, MOV ou WebM, de ${minVideoMs / 1000} à ${maxVideoSeconds} secondes, 100 Mo au plus, au moins ${minVideoShortSide} pixels sur le plus petit côté.`,
  chooseVideo: 'Choisir une vidéo',
  changeVideo: 'Changer de vidéo',
  previewName: 'Aperçu de la vidéo choisie',
  previewUnavailable: `${colon("Pas d'aperçu", 'ton navigateur ne sait pas lire cette vidéo.')} AcroFunJam la préparera après l'envoi.`,
  caption: 'Légende',
  captionHelp:
    "Ce que montre la vidéo, et s'il s'agit d'une démonstration ou d'un tutoriel. Ne nomme pas les personnes filmées.",
  captionExample: colon('Exemple', 'Pop to Bird, vue de côté, tutoriel'),
  credit: 'Crédit',
  creditHelp: `${colon('La personne, le duo ou le collectif à qui appartient la vidéo, présenté sous elle', quoted(colon('Vidéo', 'Léa Martin')))}.`,
  description: 'Description de la vidéo',
  optional: '(facultative)',
  descriptionHelp: `${colon('Décris le mouvement pour qui ne voit pas la vidéo', 'ce que font la base et le flyer.')} Ne nomme pas les personnes filmées.`,
  descriptionExample: colon(
    'Exemple',
    "La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol.",
  ),
  rights:
    "Je confirme que l'auteur de la vidéo a autorisé sa publication sur AcroFunJam, que chaque personne filmée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable.",
  rightsHelp: 'AcroFunJam garde ta confirmation avec la vidéo (ton compte et la date).',
  submit: 'Ajouter la vidéo',
  sending: 'Envoi de la vidéo…',
  sendingProgress: 'Envoi de la vidéo',
  checking: 'Vérification de la vidéo…',
  cancelSending: "Annuler l'envoi",
  abandonQuestion: `Abandonner cette vidéo${narrowSpace}? Ta saisie sera perdue.`,
  abandon: 'Abandonner',
  continueAdding: "Continuer l'ajout",
  // Errors of the fields.
  fileRequired: 'Choisis une vidéo.',
  captionRequired: colon('Décris la vidéo', 'la légende est obligatoire.'),
  captionTooLong: 'La légende ne doit pas dépasser 100 caractères.',
  creditRequired: colon(
    'Indique le crédit de la vidéo',
    'la personne, le duo ou le collectif à qui elle appartient.',
  ),
  creditTooLong: 'Le crédit ne doit pas dépasser 100 caractères.',
  /** Refused by AcroFunJam (« inconnu », « Auteur inconnu »…): shown under the field « Crédit ». */
  creditNotAnAuthor:
    "Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, n'ajoute pas cette vidéo.",
  /** The same refusal in « Modifier »: the video is already there. */
  creditNotAnAuthorWhenCorrecting:
    'Le crédit doit nommer à qui appartient la vidéo. Si tu ne sais pas à qui elle appartient, retire cette vidéo.',
  descriptionTooLong: 'La description ne doit pas dépasser 300 caractères.',
  rightsRequired: "Confirme tes droits sur la vidéo et l'accord des personnes filmées.",
} as const;

export const videoCreditLabel = (credit: string) => colon('Vidéo', credit);

export const videoCountLabel = (count: number) =>
  `${count} ${count > 1 ? 'vidéos' : 'vidéo'} sur ${maxVideosPerTransition}`;

const truncatedSeconds = (durationMs: number) => Math.floor(durationMs / 1000);

/** « 0:12 »: minutes and seconds, as the phones show it, on the poster. */
export const videoDurationBadge = (durationMs: number) => {
  const seconds = truncatedSeconds(durationMs);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const secondsLabel = (seconds: number) => `${seconds} ${seconds > 1 ? 'secondes' : 'seconde'}`;

/** The accessible name of the button « Lire »: the visible word first (WCAG 2.5.3), the caption, the duration. */
export const videoPlayName = (caption: string, durationMs: number) =>
  `${transitionVideoLabels.play} ${caption} (${secondsLabel(truncatedSeconds(durationMs))})`;

export const videoRemovalText = (consequence: 'last' | 'other', transition: string) =>
  consequence === 'last'
    ? `${transition} n'aura plus de vidéo, et celle-ci ne pourra pas être récupérée.`
    : 'Elle ne sera plus visible, et ne pourra pas être récupérée.';

const megabytes = (bytes: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));

/** « pop.mp4 · 18,4 Mo · 12 secondes · 1080 × 1920 pixels »; without what the browser could not read. */
export const videoFileSummary = (
  name: string,
  size: number,
  durationMs: number | null,
  dimensions: VideoDimensions | null,
) =>
  [
    name,
    `${megabytes(size)} Mo`,
    ...(durationMs === null ? [] : [secondsLabel(truncatedSeconds(durationMs))]),
    ...(dimensions ? [`${dimensions.width}${noBreakSpace}×${noBreakSpace}${dimensions.height} pixels`] : []),
  ].join(' · ');

/** Why a file is refused (the shape of VideoRefusal, described here: the presentation only depends on the domain). */
export type VideoRefusalShape =
  | { readonly reason: 'format' | 'too-large' | 'too-short' | 'too-small' }
  | { readonly reason: 'too-long'; readonly seconds?: number };

/** The message under the field « Vidéo » for a file refused, by the site as soon as it is chosen or by the API. */
export const videoRefusalMessage = (refusal: VideoRefusalShape): string => {
  switch (refusal.reason) {
    case 'format':
      return "Ce fichier n'est pas une vidéo MP4, MOV ou WebM. Choisis une autre vidéo.";
    case 'too-long':
      return refusal.seconds === undefined
        ? `Cette vidéo dure plus de ${maxVideoSeconds} secondes. ${tooLongEnd}`
        : `${colon(`Cette vidéo dure ${refusal.seconds} secondes`, `${maxVideoSeconds} secondes au plus.`)} ${tooLongEnd}`;
    case 'too-large':
      return 'Cette vidéo dépasse 100 Mo. Choisis une vidéo plus courte ou plus légère.';
    case 'too-short':
      return 'Cette vidéo dure moins de 2 secondes. Choisis une vidéo plus longue.';
    case 'too-small':
      return `${colon('Cette vidéo est trop petite', `il faut au moins ${minVideoShortSide} pixels sur le plus petit côté.`)} Choisis une vidéo de meilleure qualité.`;
  }
};

const messageOfCode: Readonly<Record<string, string>> = {
  'video.file-required': transitionVideoLabels.fileRequired,
  'video.unreadable': "Cette vidéo n'a pas pu être lue. Choisis une autre vidéo.",
  'video.caption-required': transitionVideoLabels.captionRequired,
  'video.caption-too-long': transitionVideoLabels.captionTooLong,
  'video.credit-required': transitionVideoLabels.creditRequired,
  'video.credit-too-long': transitionVideoLabels.creditTooLong,
  'video.credit-not-an-author': transitionVideoLabels.creditNotAnAuthor,
  'video.description-too-long': transitionVideoLabels.descriptionTooLong,
  'video.rights-confirmation-required': transitionVideoLabels.rightsRequired,
};

/**
 * The errors of the videos as the site receives them (the shape of TransitionVideosError, described here: the
 * presentation only depends on the domain, ADR 0021).
 */
export type VideoErrorShape =
  | {
      readonly kind:
        | 'unreachable'
        | 'session-expired'
        | 'role-withdrawn'
        | 'limit-reached'
        | 'not-found'
        | 'video-not-found'
        | 'busy'
        | 'cancelled'
        | 'outdated'
        | 'invalid-input';
    }
  | { readonly kind: 'invalid'; readonly code: string }
  | ({ readonly kind: 'file-refused' } & VideoRefusalShape);

/** The message of an error that is not a field of the form (alert at the top of the form, or of a zone). */
export const videoErrorMessage = (error: VideoErrorShape, transition: string): string => {
  switch (error.kind) {
    case 'unreachable':
      return `${colon("La vidéo n'a pas pu être envoyée", 'impossible de joindre AcroFunJam.')} Vérifie ta connexion Internet, puis réessaie.`;
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la vidéo.';
    case 'role-withdrawn':
      return colon('Tu ne peux plus gérer les vidéos', 'ton rôle a changé.');
    case 'limit-reached':
      return `${colon(`${transition} a déjà ${maxVideosPerTransition} vidéos`, 'une autre a été ajoutée entre-temps.')} Retire une vidéo pour en ajouter une autre.`;
    case 'not-found':
      return transitionVideoLabels.transitionNotFound;
    case 'video-not-found':
      return "Cette vidéo n'est plus dans le catalogue.";
    case 'busy':
      return "AcroFunJam reçoit déjà d'autres vidéos. Ta saisie est gardée. Réessaie dans quelques minutes.";
    case 'cancelled':
      return `Envoi annulé. ${colon('Ta saisie est gardée', 'tu peux renvoyer la vidéo.')}`;
    case 'outdated':
      return `${colon("La vidéo n'a pas pu être envoyée", 'le site doit être mis à jour.')} Recharge la page, puis choisis de nouveau la vidéo.`;
    case 'invalid':
      return messageOfCode[error.code] ?? "Cette vidéo n'a pas pu être ajoutée.";
    case 'file-refused':
      return videoRefusalMessage(error);
    case 'invalid-input':
      return transitionVideoLabels.fileRequired;
  }
};

/**
 * The message of an error of « Modifier » or « Retirer » (an alert in the zone, under the video): nothing is sent there,
 * so it never speaks of a sending nor of choosing the video again (O1, O2).
 */
export const videoManagementErrorMessage = (error: VideoErrorShape, transition: string): string => {
  switch (error.kind) {
    case 'unreachable':
      return 'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.';
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau, puis réessaie.';
    case 'outdated':
      return 'Le site doit être mis à jour. Recharge la page, puis réessaie.';
    case 'invalid':
      return error.code === 'video.credit-not-an-author'
        ? transitionVideoLabels.creditNotAnAuthorWhenCorrecting
        : videoErrorMessage(error, transition);
    default:
      return videoErrorMessage(error, transition);
  }
};

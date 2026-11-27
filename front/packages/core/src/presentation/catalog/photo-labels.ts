import type { PhotoDimensions } from '../../domain/catalog/pose-photos';
import { maxPhotosPerPose } from '../../domain/catalog/pose-photos';

// Story 10 « Photos des poses » (UX-15 to UX-29, decouverte.md): the texts of the photos, shared by the site and the
// application (ADR 0021). Never « image », « média », « illustration », « auteur », « supprimer ».

/** The narrow no-break space inside the French quotation marks « … ». */
const narrowSpace = '\u202f';

export const posePhotoLabels = {
  sectionTitle: (pose: string) => `Photos de ${pose}`,
  otherPhotosTitle: (pose: string) => `Autres photos de ${pose}`,
  addPhoto: 'Ajouter une photo',
  /** The accessible name of the invitation: « Ajouter une photo » then the pose, hidden visually. */
  addPhotoName: (pose: string) => `Ajouter une photo de ${pose}`,
  noPhotoYet: (pose: string) => `${pose} n'a pas encore de photo.`,
  maximumReached: (pose: string) =>
    `${pose} a déjà ${maxPhotosPerPose} photos, le maximum. Retire une photo pour en ajouter une autre.`,
  mainPhotoMark: 'Photo principale (vignette du catalogue)',
  enlarge: (altText: string) => `Agrandir la photo : ${altText}`,
  close: 'Fermer',
  previous: 'Photo précédente',
  next: 'Photo suivante',
  unavailable: 'Photo indisponible.',
  // Managing a photo (validators and administrators).
  chooseAsMain: 'Choisir comme photo principale',
  chooseAsMainName: (altText: string) => `Choisir comme photo principale : ${altText}`,
  correct: 'Modifier',
  correctName: (altText: string) => `Modifier le texte alternatif et le crédit : ${altText}`,
  correctTitle: 'Texte alternatif et crédit',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  remove: 'Retirer',
  removeName: (altText: string) => `Retirer la photo : ${altText}`,
  removeQuestion: (pose: string) => `Retirer cette photo de ${pose} ?`,
  removeConfirm: 'Retirer la photo',
  removing: 'Retrait…',
  // Announcements.
  added: (pose: string) => `Photo ajoutée à ${pose}.`,
  removed: (pose: string) => `Photo retirée de ${pose}.`,
  corrected: 'Texte alternatif et crédit enregistrés.',
  mainChosen: (altText: string, pose: string) =>
    `«${narrowSpace}${altText}${narrowSpace}» est maintenant la photo principale de ${pose}.`,
  // The page « Ajouter une photo de Throne ».
  addPageTitle: (pose: string) => `Ajouter une photo de ${pose}`,
  /** The link back to the page of the pose while its name is not known yet. */
  back: 'Retour',
  allFieldsRequired: 'Tous les champs sont obligatoires, sauf le texte alternatif.',
  photo: 'Photo',
  photoHelp: 'JPEG, PNG, WebP ou HEIC, au moins 800 pixels sur le plus petit côté.',
  choosePhoto: 'Choisir une photo',
  changePhoto: 'Changer de photo',
  heicPreviewUnavailable:
    "Ton navigateur ne sait pas afficher cette photo HEIC. AcroFunJam la vérifiera après l'envoi.",
  altText: 'Texte alternatif (facultatif)',
  altTextHelp:
    "Décris la pose pour qui ne voit pas la photo : ce que font la base et le flyer. Inutile d'écrire « Photo de ». Si la pose a plusieurs photos, précise l'angle (vue de côté, détail des prises).",
  altTextExample:
    "Exemple : Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer, face au sol à l'horizontale, bras écartés.",
  credit: 'Crédit',
  creditHelp:
    "Le nom de la personne qui a pris la photo, présenté sous elle : « Photo : Léa Martin ». Si tu l'as prise toi-même, écris ton nom.",
  rights:
    "Je confirme que l'auteur de la photo a autorisé sa publication sur AcroFunJam, que chaque personne photographiée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable.",
  rightsHelp: 'AcroFunJam garde ta confirmation avec la photo (ton compte et la date).',
  submit: 'Ajouter la photo',
  sending: 'Envoi de la photo…',
  sendingProgress: 'Envoi de la photo',
  preparing: 'Préparation de la photo…',
  cancelSending: "Annuler l'envoi",
  abandonQuestion: 'Abandonner cette photo ? Ta saisie sera perdue.',
  abandon: 'Abandonner',
  continueAdding: "Continuer l'ajout",
  // Errors of the fields (UX-20).
  fileRequired: 'Choisis une photo.',
  formatRefused: "Ce fichier n'est pas une photo JPEG, PNG, WebP ou HEIC. Choisis une autre photo.",
  tooLarge: 'Cette photo doit peser 10 Mo au plus. Choisis une photo plus légère.',
  tooSmall: 'Il faut au moins 800 pixels sur le plus petit côté. Choisis une photo plus grande.',
  /** UX-20: the dimensions of the photo chosen, when the browser can read them. */
  tooSmallMeasured: (width: number, height: number) =>
    `Cette photo mesure ${width} × ${height} pixels : il faut au moins 800 pixels sur le plus petit côté. Choisis une photo plus grande.`,
  altTextTooLong: 'Le texte alternatif ne doit pas dépasser 200 caractères.',
  creditRequired: "Indique le crédit de la photo : le nom de la personne qui l'a prise.",
  creditTooLong: 'Le crédit ne doit pas dépasser 100 caractères.',
  /** Refused by AcroFunJam (« inconnu », « Auteur inconnu »…): shown under the field « Crédit ». */
  creditNotAnAuthor:
    "Le crédit doit nommer la personne qui a pris la photo. Si tu ne sais pas qui l'a prise, n'ajoute pas cette photo.",
  /** The same refusal in « Modifier »: the photo is already there. */
  creditNotAnAuthorWhenCorrecting:
    "Le crédit doit nommer la personne qui a pris la photo. Si tu ne sais pas qui l'a prise, retire cette photo.",
  rightsRequired: "Confirme tes droits sur la photo et l'accord des personnes photographiées.",
} as const;

export const photoCreditLabel = (credit: string) => `Photo : ${credit}`;

export const photoCountLabel = (count: number) =>
  `${count} ${count > 1 ? 'photos' : 'photo'} sur ${maxPhotosPerPose}`;

/** The link under the main photo towards the other photos, at the bottom of the page. */
export const morePhotosLink = (others: number) =>
  others === 1 ? "Voir l'autre photo" : `Voir les ${others} autres photos`;

/**
 * What a photo is said to be: its alternative text, or, when it has none (revision of 2026-11-26), its rank in the order
 * of presentation (the main photo is the first) and its pose: « Photo 2 de Bird ».
 */
export const photoDescription = (photo: { readonly altText: string | null }, rank: number, pose: string) =>
  photo.altText ?? `Photo ${rank} de ${pose}`;

export const enlargedPhotoTitle = (position: number, count: number, pose: string) =>
  `Photo ${position} sur ${count} de ${pose}`;

/** Said when the enlargement shows another photo: « Photo 3 sur 3 de Bird : Bird, les prises ». */
export const enlargedPhotoAnnouncement = (position: number, count: number, pose: string, altText: string) =>
  `${enlargedPhotoTitle(position, count, pose)} : ${altText}`;

export const removalConsequenceText = (consequence: 'main' | 'last' | 'other', pose: string) =>
  consequence === 'main'
    ? 'La photo suivante deviendra la photo principale et la vignette du catalogue.'
    : consequence === 'last'
      ? `${pose} n'aura plus de photo.`
      : 'Elle ne sera plus visible, et ne pourra pas être récupérée.';

const megabytes = (bytes: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));

/** « folded-leaf.jpg · 3,2 Mo · 4000 × 3000 pixels »; without dimensions when the browser cannot read the photo. */
export const photoFileSummary = (name: string, size: number, dimensions: PhotoDimensions | null) =>
  [
    name,
    `${megabytes(size)} Mo`,
    ...(dimensions ? [`${dimensions.width} × ${dimensions.height} pixels`] : []),
  ].join(' · ');

const messageOfCode: Readonly<Record<string, string>> = {
  'photo.file-required': posePhotoLabels.fileRequired,
  'photo.format-not-accepted': posePhotoLabels.formatRefused,
  'photo.too-large': posePhotoLabels.tooLarge,
  'photo.too-small': posePhotoLabels.tooSmall,
  'photo.unreadable': "Cette photo n'a pas pu être lue. Choisis une autre photo.",
  'photo.alt-text-too-long': posePhotoLabels.altTextTooLong,
  'photo.credit-required': posePhotoLabels.creditRequired,
  'photo.credit-too-long': posePhotoLabels.creditTooLong,
  'photo.credit-not-an-author': posePhotoLabels.creditNotAnAuthor,
  'photo.rights-confirmation-required': posePhotoLabels.rightsRequired,
};

/**
 * The errors of the photos as the site receives them (the shape of PosePhotosError, described here: the presentation only
 * depends on the domain, ADR 0021).
 */
export type PhotoErrorShape =
  | { readonly kind: 'unreachable' | 'session-expired' | 'role-withdrawn' | 'limit-reached' | 'not-found' }
  | { readonly kind: 'photo-not-found' | 'cancelled' | 'outdated' | 'invalid-input' }
  | { readonly kind: 'invalid'; readonly code: string }
  | { readonly kind: 'file-refused'; readonly reason: 'format' | 'too-large' | 'too-small' };

/** The message of an error that is not a field of the form (alert at the top of the form, or of a zone). */
export const photoErrorMessage = (error: PhotoErrorShape, pose: string): string => {
  switch (error.kind) {
    case 'unreachable':
      return "La photo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.";
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la photo.';
    case 'role-withdrawn':
      return 'Tu ne peux plus gérer les photos : ton rôle a changé.';
    case 'limit-reached':
      return `${pose} a déjà ${maxPhotosPerPose} photos : une autre a été ajoutée entre-temps. Retire une photo pour en ajouter une autre.`;
    case 'not-found':
      return "Cette pose n'est plus dans le catalogue.";
    case 'photo-not-found':
      return "Cette photo n'est plus dans le catalogue.";
    case 'cancelled':
      return 'Envoi annulé.';
    case 'outdated':
      return "La photo n'a pas pu être envoyée : le site doit être mis à jour. Recharge la page, puis choisis de nouveau la photo.";
    case 'invalid':
      return messageOfCode[error.code] ?? "Cette photo n'a pas pu être ajoutée.";
    case 'file-refused':
      return error.reason === 'format'
        ? posePhotoLabels.formatRefused
        : error.reason === 'too-small'
          ? posePhotoLabels.tooSmall
          : posePhotoLabels.tooLarge;
    case 'invalid-input':
      return posePhotoLabels.fileRequired;
  }
};

/**
 * The message of an error of « Choisir comme photo principale », « Modifier » or « Retirer » (an alert under the photo):
 * nothing is sent there, so it never speaks of a sending nor of choosing the photo again.
 */
export const photoManagementErrorMessage = (error: PhotoErrorShape, pose: string): string => {
  switch (error.kind) {
    case 'unreachable':
      return 'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.';
    case 'session-expired':
      return 'Ta session a expiré. Connecte-toi de nouveau, puis réessaie.';
    case 'outdated':
      return 'Le site doit être mis à jour. Recharge la page, puis réessaie.';
    case 'invalid':
      return error.code === 'photo.credit-not-an-author'
        ? posePhotoLabels.creditNotAnAuthorWhenCorrecting
        : photoErrorMessage(error, pose);
    default:
      return photoErrorMessage(error, pose);
  }
};

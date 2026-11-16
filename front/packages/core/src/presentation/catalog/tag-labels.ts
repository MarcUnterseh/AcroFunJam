import {
  tagDescriptionPolicy,
  type NamedTag,
  type TagCarrier,
  tagNamePolicy,
  type TagDescriptionError,
  type TagNameError,
} from '../../domain/catalog/tag';

/**
 * Presentation: French texts of the page « Étiquettes » (story 8, docs/design/ecrans/8-etiquettes.md,
 * element-etiquette.md), shared by the web and mobile apps.
 */
export const tagLabels = {
  title: 'Étiquettes',
  back: 'Catalogue',
  introduction:
    "Les étiquettes disent comment se pratique une transition. Le futur générateur de flow s'en servira.",
  catalogLink: 'Étiquettes',
  validationLink: 'Gérer les étiquettes',
  loading: 'Chargement des étiquettes…',
  loadingFailed: 'Impossible de charger les étiquettes. Vérifie ta connexion Internet, puis réessaie.',
  retry: 'Réessayer',
  retrying: 'Chargement…',
  empty: "Aucune étiquette pour l'instant.",
  listTitle: 'Les étiquettes',
  addTitle: 'Ajouter une étiquette',
  name: 'Nom',
  description: 'Description',
  descriptionHelp: 'Une phrase, idéalement avec un exemple.',
  add: "Ajouter l'étiquette",
  adding: 'Ajout…',
  edit: 'Modifier',
  remove: 'Retirer',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  cancel: 'Annuler',
  confirmRemoval: "Retirer l'étiquette",
  removing: 'Retrait…',
  removalConsequence: 'Elle ne sera plus proposée.',
  close: 'Fermer',
  /** The link from a carrier to the page of its start pose: shown « Voir Bird », read « Voir la pose Bird ». */
  seePose: 'Voir',
  seePoseHidden: 'la pose',
  nameTaken: 'Une étiquette de ce nom existe déjà dans la liste.',
  catalogTransitions: 'Transitions du catalogue',
  pendingProposals: 'Propositions en attente',
  carriedAdvice: "Retire-la d'abord de chacune.",
  notFound: "Cette étiquette n'est plus dans la liste : la page a été mise à jour.",
  roleWithdrawn: 'Ton rôle ne te permet plus de gérer les étiquettes.',
  unreachable: "Impossible d'enregistrer. Vérifie ta connexion Internet, puis réessaie.",
  outdated: 'Le site a été mis à jour. Recharge la page, puis réessaie.',
  sessionExpired: 'Ta session a expiré. Reconnecte-toi, puis réessaie.',
} as const;

/** « Portée par aucune transition » / « Portée par 1 transition » / « Portée par 2 transitions » (ux-expert). */
export const carriedByLabel = (count: number): string =>
  count === 0
    ? 'Portée par aucune transition'
    : `Portée par ${count} ${count === 1 ? 'transition' : 'transitions'}`;

/** The counter of a field of a tag, always shown (short limits: 30 and 200). */
export const tagCounterLabel = (length: number, maxLength: number): string => {
  const counter = `${length} / ${maxLength}`;
  return length > maxLength ? `${counter} : ${length - maxLength} de trop` : counter;
};

/** A transition carrying a tag: « de Bird vers Folded Leaf », or « Lunar Roll, de Folded Leaf vers Throne ». */
export const tagCarrierLabel = (carrier: TagCarrier): string => {
  const poses = `de ${carrier.fromPose.name} vers ${carrier.toPose.name}`;
  return carrier.name ? `${carrier.name}, ${poses}` : poses;
};

/** The removal of a tag refused because it is carried (L10). */
export const carriedRefusalLabel = (tagName: string): string =>
  `« ${tagName} » ne peut pas être retirée : ces transitions la portent.`;

/** The question before removing a tag. */
export const removalQuestion = (tagName: string): string => `Retirer « ${tagName} » de la liste ?`;

const quotedList = (names: readonly string[]): string => {
  const quoted = names.map((name) => `« ${name} »`);
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} et ${quoted.at(-1)}` : (quoted[0] ?? '');
};

/** The removal of a tag refused because tags of the list add it (« dynamique » while « pop » is there). */
export const impliedRefusalLabel = (tagName: string, impliedBy: readonly NamedTag[]): string =>
  `« ${tagName} » ne peut pas être retirée tant que ${quotedList(impliedBy.map((tag) => tag.name))} ${
    impliedBy.length > 1 ? "l'ajoutent" : "l'ajoute"
  }.`;

/** Status announcements after a change of the list (no success panel). */
export const tagAnnouncements = {
  added: (name: string) => `Étiquette « ${name} » ajoutée.`,
  saved: (name: string) => `Étiquette « ${name} » enregistrée.`,
  removed: (name: string) => `Étiquette « ${name} » retirée.`,
} as const;

const fieldErrors: Readonly<Record<TagNameError | TagDescriptionError, string>> = {
  'tag.name-required': "Le nom de l'étiquette est obligatoire.",
  'tag.name-without-letter-or-digit': "Le nom de l'étiquette doit contenir une lettre ou un chiffre.",
  'tag.name-too-long': `Le nom de l'étiquette ne doit pas dépasser ${tagNamePolicy.maxLength} caractères.`,
  'tag.description-required': "La description de l'étiquette est obligatoire.",
  'tag.description-too-long': `La description de l'étiquette ne doit pas dépasser ${tagDescriptionPolicy.maxLength} caractères.`,
};

/** The rule a field of a tag breaks, explained under the field. */
export const tagFieldErrorMessage = (code: TagNameError | TagDescriptionError): string => fieldErrors[code];

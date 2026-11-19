import {
  tagAppliesToPoses,
  tagAppliesToTransitions,
  type TagScope,
} from '../../domain/shared-kernel/tag-scope';
import {
  tagDescriptionPolicy,
  type NamedTag,
  type PendingPoseCarrier,
  type TagCarrier,
  type TagScopeError,
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
    "Les étiquettes décrivent les poses et les transitions. Le futur générateur de flow s'en servira.",
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
  /** Story 9a: the group of what a tag applies to (ADR 0035). */
  scope: "S'applique à",
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
  catalogPoses: 'Poses du catalogue',
  catalogTransitions: 'Transitions du catalogue',
  pendingProposals: 'Propositions en attente',
  carriedAdvice: "Retire-la d'abord de chacune.",
  notFound: "Cette étiquette n'est plus dans la liste : la page a été mise à jour.",
  roleWithdrawn: 'Ton rôle ne te permet plus de gérer les étiquettes.',
  unreachable: "Impossible d'enregistrer. Vérifie ta connexion Internet, puis réessaie.",
  outdated: 'Le site a été mis à jour. Recharge la page, puis réessaie.',
  scopeExceedsImplied: "L'étiquette que celle-ci ajoute ne s'applique pas à tous ces éléments.",
  sessionExpired: 'Ta session a expiré. Reconnecte-toi, puis réessaie.',
} as const;

const counted = (count: number, one: string, many: string, none: string): string =>
  count === 0 ? none : `${count} ${count === 1 ? one : many}`;

/**
 * « Portée par 2 transitions », « Portée par 1 pose », « Portée par 1 pose et 2 transitions », « Portée par aucune pose ni
 * aucune transition »: the published elements carrying the tag, among what it applies to (ux-expert, story 9a A7).
 */
export const carriedByLabel = (tag: {
  readonly scope: TagScope;
  readonly poseCount: number;
  readonly transitionCount: number;
}): string => {
  const poses = counted(tag.poseCount, 'pose', 'poses', 'aucune pose');
  const transitions = counted(tag.transitionCount, 'transition', 'transitions', 'aucune transition');
  if (!tagAppliesToPoses(tag)) return `Portée par ${transitions}`;
  if (!tagAppliesToTransitions(tag)) return `Portée par ${poses}`;
  if (tag.poseCount === 0 && tag.transitionCount === 0) return 'Portée par aucune pose ni aucune transition';
  return `Portée par ${poses} et ${transitions}`;
};

const scopeStatements: Readonly<Record<TagScope, string>> = {
  poses: "S'applique aux poses",
  transitions: "S'applique aux transitions",
  'poses-and-transitions': "S'applique aux poses et aux transitions",
};

const scopeChoices: Readonly<Record<TagScope, string>> = {
  poses: 'Aux poses',
  transitions: 'Aux transitions',
  'poses-and-transitions': 'Aux poses et aux transitions',
};

/** What a tag applies to, under its name (story 9a): « S'applique aux poses et aux transitions ». */
export const tagScopeLabel = (scope: TagScope): string => scopeStatements[scope];

/** A choice of the group « S'applique à »: « Aux poses ». */
export const tagScopeChoiceLabel = (scope: TagScope): string => scopeChoices[scope];

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

/** The removal of a tag refused because it is carried (L10, story 9a A6). */
export const carriedRefusalLabel = (tagName: string): string =>
  `« ${tagName} » ne peut pas être retirée : ces éléments la portent.`;

/** A tag that cannot cease to apply to poses or to transitions that carry it (story 9a A4). */
export const scopeCarriedRefusalLabel = (tagName: string, withdrawn: 'poses' | 'transitions'): string =>
  `« ${tagName} » ne peut pas cesser de s'appliquer aux ${withdrawn} : ces éléments la portent.`;

/** A pending proposal about a pose carrying a tag: « Proposition de la pose Candlestick ». */
export const pendingPoseCarrierLabel = (carrier: PendingPoseCarrier): string =>
  `${carrier.kind === 'pose-proposal' ? 'Proposition' : 'Modification'} de la pose ${carrier.name}`;

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

/** A tag whose scope tags of the list still need, as they add it (story 9a, ADR 0035). */
export const scopeNeededRefusalLabel = (tagName: string, impliedBy: readonly NamedTag[]): string =>
  `« ${tagName} » doit garder ce champ d'application tant que ${quotedList(impliedBy.map((tag) => tag.name))} ${
    impliedBy.length > 1 ? "l'ajoutent" : "l'ajoute"
  }.`;

/** Status announcements after a change of the list (no success panel). */
export const tagAnnouncements = {
  added: (name: string) => `Étiquette « ${name} » ajoutée.`,
  saved: (name: string) => `Étiquette « ${name} » enregistrée.`,
  removed: (name: string) => `Étiquette « ${name} » retirée.`,
} as const;

const fieldErrors: Readonly<Record<TagNameError | TagDescriptionError | TagScopeError, string>> = {
  'tag.name-required': "Le nom de l'étiquette est obligatoire.",
  'tag.name-without-letter-or-digit': "Le nom de l'étiquette doit contenir une lettre ou un chiffre.",
  'tag.name-too-long': `Le nom de l'étiquette ne doit pas dépasser ${tagNamePolicy.maxLength} caractères.`,
  'tag.description-required': "La description de l'étiquette est obligatoire.",
  'tag.description-too-long': `La description de l'étiquette ne doit pas dépasser ${tagDescriptionPolicy.maxLength} caractères.`,
  'tag.scope-required': "Choisis à quoi s'applique l'étiquette.",
};

/** The rule a field of a tag breaks, explained under the field. */
export const tagFieldErrorMessage = (code: TagNameError | TagDescriptionError | TagScopeError): string =>
  fieldErrors[code];

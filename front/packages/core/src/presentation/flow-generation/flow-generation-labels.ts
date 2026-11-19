import type { FlowCriteria } from '../../domain/flow-generation/flow-criteria';
import { endPose, type GeneratedFlow } from '../../domain/flow-generation/generated-flow';
import { unnamedTransitionLabel } from '../catalog/pose-page-labels';

/**
 * Presentation: French texts of the generator of flows (story 9), shared by the web and mobile apps:
 * docs/design/ecrans/9-generer-un-flow.md and the decisions of 2026-11-19 (decouverte.md), the texts marked « proposé »
 * kept as proposed.
 */
export const flowGenerationLabels = {
  /** The secondary button of the catalog, and the title of the page of the form. */
  generate: 'Générer un flow',
  generating: 'Génération du flow…',
  backToCatalog: 'Catalogue',
  intro:
    'Choisis la longueur et la difficulté : AcroFunJam tire au hasard un flow parmi les poses et les transitions du catalogue.',
  length: 'Nombre de transitions',
  lengthHelp: 'De 1 à 10. Un flow de 3 transitions enchaîne 4 poses.',
  ceilingsHelp: 'Aucune pose ni transition du flow ne dépassera ce niveau.',
  baseCeiling: 'Difficulté base, au plus',
  flyerCeiling: 'Difficulté flyer, au plus',
  tags: 'Étiquettes (facultatives)',
  requested: "Avec l'une de ces étiquettes",
  requestedHelp: "Chaque étape portera l'une de ces étiquettes, sur la transition ou sur la pose d'arrivée.",
  excluded: 'Sans ces étiquettes',
  excludedHelp: 'Seuls les éléments étiquetés sont écartés : vérifie chaque étape.',
  /** In the pill of a tag chosen in the other group, disabled. */
  requestedMark: '(demandée)',
  excludedMark: '(exclue)',
  tagsNotLoaded: "Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette.",
  /** The flow. */
  title: 'Ton flow',
  criteria: 'Critères du flow',
  none: 'aucune',
  generateAnother: 'Générer un autre flow',
  changeCriteria: 'Modifier les critères',
  sameFlowAgain: 'Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix.',
  spotterReminder:
    "Ce flow est tiré au hasard : il peut contenir des transitions que ton duo n'a jamais faites. Travaillez-les d'abord une par une, avec un spotter. Chacun peut dire stop à tout moment.",
  start: 'Départ :',
  towards: 'Vers',
  washingMachine: 'washing machine',
  samePose: '(même pose)',
  description: 'Description',
  /** The accessible name of the ordered list of the steps. */
  steps: 'Étapes du flow',
  /** No flow. */
  tooRestrictive: 'Critères trop restrictifs : impossible de générer un flow.',
  wideningLead: 'Pour élargir le choix, essaie :',
  catalogInsufficient: 'Le catalogue ne permet pas encore de générer un flow.',
  catalogInsufficientDetail: 'Il manque encore des poses ou des transitions pour former un enchaînement.',
  seeCatalog: 'Voir le catalogue',
  unreachable: 'Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie.',
  retry: 'Réessayer',
  outdated: "Le flow n'a pas pu être généré : le site doit être mis à jour. Recharge la page.",
} as const;

const transitions = (count: number): string => `${count} ${count > 1 ? 'transitions' : 'transition'}`;

/** « 3 transitions, de Throne à Folded Leaf. »: the sentence one remembers. */
export const flowSummary = (flow: GeneratedFlow): string =>
  `${transitions(flow.steps.length)}, de ${flow.start.name} à ${endPose(flow).name}.`;

/**
 * The title of a step: « Étape 1 », then the name of its transition or, without a name, its poses (shown « Bird → Folded
 * Leaf », read « de Bird vers Folded Leaf »).
 */
export const flowStepTitle = (
  flow: GeneratedFlow,
  index: number,
): {
  readonly number: string;
  readonly name: string | null;
  readonly unnamed: ReturnType<typeof unnamedTransitionLabel> | null;
} => {
  const step = flow.steps[index]!;
  const from = index === 0 ? flow.start : flow.steps[index - 1]!.arrival;
  return {
    number: `Étape ${step.number}`,
    name: step.transition.name,
    unnamed:
      step.transition.name === null
        ? unnamedTransitionLabel({ from: from.name, to: step.arrival.name })
        : null,
  };
};

/** The count in the summary of the fold of the tags: none when nothing is chosen. */
export const chosenTagsCountLabel = (count: number): string | null =>
  count === 0 ? null : `${count} ${count > 1 ? 'choisies' : 'choisie'}`;

const quoted = (name: string) => `« ${name} »`;

/** The alert when chosen tags left the list meanwhile (information, not a fault): the criteria are kept without them. */
export const tagsNoLongerAvailableLabel = (names: readonly string[]): string => {
  const all = names.map(quoted);
  const enumerated = all.length <= 1 ? (all[0] ?? '') : `${all.slice(0, -1).join(', ')} et ${all.at(-1)}`;
  const removed =
    names.length === 0
      ? "Une étiquette choisie n'est plus disponible."
      : names.length > 1
      ? `Les étiquettes ${enumerated} ne sont plus disponibles.`
      : `L'étiquette ${enumerated} n'est plus disponible.`;
  return `${removed} Vérifie tes étiquettes, puis génère de nouveau ton flow.`;
};

/** The leads to widen the choice when the criteria are too restrictive, those that apply to these criteria. */
export const wideningHints = (criteria: FlowCriteria): string[] => [
  ...(criteria.length > 1 ? ['moins de transitions'] : []),
  // Always offered, as decided (UX-5), even at « avancé »: a ceiling may be raised on the other role, or the catalog grow.
  'des plafonds de difficulté plus hauts',
  ...(criteria.excludedTagIds.length > 0 ? ["moins d'étiquettes exclues"] : []),
  ...(criteria.requestedTagIds.length > 0 ? ["plus d'étiquettes demandées, ou aucune"] : []),
];

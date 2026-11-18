import type { TagReference } from '../../domain/shared-kernel/transition-tags';

/**
 * Presentation: French texts of the tags of a transition (story 8), shared by the Catalog (page of a pose, zone
 * « Étiqueter ») and Contribution (form, validation queue, « Mes propositions »), by the web and mobile apps:
 * docs/design/ecrans/8-etiquettes.md and its components, the texts marked « proposé » kept as proposed.
 */
export const transitionTagLabels = {
  /** Legend of the group of the form « Proposer une transition » (groupe-cases-pastilles.md). */
  legend: 'Étiquettes (facultatives)',
  help: 'Choisis celles qui décrivent le passage.',
  /** Label of the line of pills of a transition (pilule-etiquette.md). */
  line: 'Étiquettes',
  /** In place of the pills, in the validation queue, when the transition carries none. */
  none: 'aucune',
  /** Fold of the descriptions of every tag of the list, under a group of checkboxes. */
  listMeanings: 'Ce que veulent dire les étiquettes',
  /** Fold of the descriptions of the tags of one transition, on the page of a pose. */
  transitionMeanings: 'Ce que veulent dire ces étiquettes',
  /** Term of the adjustment of the tags (recapitulatif-ajustements.md). */
  adjustmentTerm: 'Étiquettes',
} as const;

const quoted = (name: string) => `« ${name} »`;

/** « « a » », « « a » et « b » », « « a », « b » et « c » ». */
const enumerated = (names: readonly string[]): string => {
  const all = names.map(quoted);
  return all.length <= 1 ? (all[0] ?? '') : `${all.slice(0, -1).join(', ')} et ${all.at(-1)}`;
};

/** « dynamique, pop », or « aucune »: the tags of a transition in a sentence (adjustments, reminders). */
export const tagNamesSentence = (tags: readonly TagReference[]): string =>
  tags.length === 0 ? transitionTagLabels.none : tags.map((tag) => tag.name).join(', ');

/** « Proposées : dynamique, pop »: reminder of the proposed tags in the adjustment zone of a transition. */
export const proposedTagsLabel = (tags: readonly TagReference[]): string =>
  `Proposées : ${tagNamesSentence(tags)}`;

/** Note under the checkboxes once a tag adding another is chosen (Q136). */
export const impliedTagNote = (implied: string, implying: readonly string[]): string =>
  `${quoted(implied)} est ajoutée : ${enumerated(implying)} ${implying.length > 1 ? "l'ajoutent" : "l'ajoute"} toujours.`;

/** Alert of the form when chosen tags left the list while the person was typing (information, not a fault). */
export const tagsNoLongerInListLabel = (tags: readonly TagReference[]): string => {
  const names = enumerated(tags.map((tag) => tag.name));
  const removed =
    tags.length > 1
      ? `Les étiquettes ${names} ne font plus partie de la liste des étiquettes.`
      : `L'étiquette ${names} ne fait plus partie de la liste des étiquettes.`;
  return `${removed} Vérifie tes étiquettes, puis envoie de nouveau ta transition.`;
};

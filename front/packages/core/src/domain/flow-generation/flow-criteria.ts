import type { DifficultyLevel } from '../shared-kernel/difficulty-level';

/**
 * The criteria of a generation of flow (story 9, G5, K1 to K9): the exact number of transitions, the two ceilings of
 * difficulty (« au plus », inclusive) and the tags requested (each step carries one, on its transition or on its arrival
 * pose) or excluded (no pose nor transition carries one). A tag is never requested and excluded at once on the site.
 */
export type FlowCriteria = {
  readonly length: number;
  readonly baseCeiling: DifficultyLevel;
  readonly flyerCeiling: DifficultyLevel;
  readonly requestedTagIds: readonly string[];
  readonly excludedTagIds: readonly string[];
};

/** The two groups of tags of the generator. */
export type TagCriterion = 'requested' | 'excluded';

export const minFlowLength = 1;
export const maxFlowLength = 10;

/** The lengths offered: 1 to 10 transitions. */
export const flowLengths: readonly number[] = Array.from(
  { length: maxFlowLength - minFlowLength + 1 },
  (_, index) => minFlowLength + index,
);

/** The preselection of the site (Q185): 3 transitions, « débutant » for the base and the flyer, no tag. */
export const defaultFlowCriteria: FlowCriteria = {
  length: 3,
  baseCeiling: 'beginner',
  flyerCeiling: 'beginner',
  requestedTagIds: [],
  excludedTagIds: [],
};

const tagsOf = (criteria: FlowCriteria, criterion: TagCriterion): readonly string[] =>
  criterion === 'requested' ? criteria.requestedTagIds : criteria.excludedTagIds;

/** The group a tag is chosen in, if any. */
export const tagCriterionOf = (criteria: FlowCriteria, tagId: string): TagCriterion | null =>
  criteria.requestedTagIds.includes(tagId)
    ? 'requested'
    : criteria.excludedTagIds.includes(tagId)
      ? 'excluded'
      : null;

/**
 * Chooses a tag in a group, or no longer: a tag chosen in the other group cannot be (it is disabled there, « (demandée) »
 * or « (exclue) »), the criteria stay as they are.
 */
export const toggleTag = (criteria: FlowCriteria, criterion: TagCriterion, tagId: string): FlowCriteria => {
  const chosenIn = tagCriterionOf(criteria, tagId);
  if (chosenIn !== null && chosenIn !== criterion) return criteria;
  const tags = tagsOf(criteria, criterion);
  const toggled = chosenIn === criterion ? tags.filter((id) => id !== tagId) : [...tags, tagId];
  return criterion === 'requested'
    ? { ...criteria, requestedTagIds: toggled }
    : { ...criteria, excludedTagIds: toggled };
};

/** The same criteria without these tags (tags no longer in the list, K8): the rest is kept. */
export const withoutTags = (criteria: FlowCriteria, tagIds: readonly string[]): FlowCriteria => ({
  ...criteria,
  requestedTagIds: criteria.requestedTagIds.filter((id) => !tagIds.includes(id)),
  excludedTagIds: criteria.excludedTagIds.filter((id) => !tagIds.includes(id)),
});

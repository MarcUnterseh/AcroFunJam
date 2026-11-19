import {
  defaultFlowCriteria,
  difficultyScale,
  flowLengths,
  type DifficultyLevel,
  type FlowCriteria,
} from '@acrofunjam/core';

// Story 9 (UX-2): the criteria live in the address of the page, so that it can be reloaded, kept or shared; the flow lives
// in the history state, so that coming back from the page of a pose finds it again.

const isLevel = (value: string | null): value is DifficultyLevel =>
  value !== null && (difficultyScale as readonly string[]).includes(value);

/** The criteria of an address; a missing or unknown value takes the preselection (Q185). */
export const criteriaOf = (search: string): FlowCriteria => {
  const params = new URLSearchParams(search);
  const length = Number(params.get('transitions'));
  const base = params.get('base');
  const flyer = params.get('flyer');
  const requested = [...new Set(params.getAll('avec'))];
  return {
    length: flowLengths.includes(length) ? length : defaultFlowCriteria.length,
    baseCeiling: isLevel(base) ? base : defaultFlowCriteria.baseCeiling,
    flyerCeiling: isLevel(flyer) ? flyer : defaultFlowCriteria.flyerCeiling,
    requestedTagIds: requested,
    // A tag never stays both requested and excluded: requested wins, the site disables it in the other group.
    excludedTagIds: [...new Set(params.getAll('sans'))].filter((id) => !requested.includes(id)),
  };
};

/** « ?transitions=3&base=beginner&flyer=beginner&avec=…&sans=… ». */
export const searchOf = (criteria: FlowCriteria): string => {
  const params = new URLSearchParams({
    transitions: String(criteria.length),
    base: criteria.baseCeiling,
    flyer: criteria.flyerCeiling,
  });
  for (const id of criteria.requestedTagIds) params.append('avec', id);
  for (const id of criteria.excludedTagIds) params.append('sans', id);
  return `?${params.toString()}`;
};

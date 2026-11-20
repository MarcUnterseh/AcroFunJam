import { describe, expect, it } from 'vitest';
import {
  defaultFlowCriteria,
  flowLengths,
  fewerTransitions,
  moreTransitions,
  tagCriterionOf,
  toggleTag,
  withoutTags,
  type FlowCriteria,
} from './flow-criteria';

// Story 9 « Générer un flow »: the criteria of a generation (G5, K1 to K9, decisions of 2026-11-19).

const criteria = (overrides: Partial<FlowCriteria> = {}): FlowCriteria => ({
  ...defaultFlowCriteria,
  ...overrides,
});

describe('flow criteria', () => {
  it('should preselect 3 transitions and « débutant » for the base and the flyer, without tag, when the generator opens', () => {
    expect(defaultFlowCriteria).toEqual({
      length: 3,
      baseCeiling: 'beginner',
      flyerCeiling: 'beginner',
      requestedTagIds: [],
      excludedTagIds: [],
    });
  });

  it('should offer lengths from 1 to 10 transitions when choosing the length', () => {
    expect(flowLengths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should request a tag when it is chosen in the group « Avec l’une de ces étiquettes »', () => {
    expect(toggleTag(criteria(), 'requested', 'lunaire').requestedTagIds).toEqual(['lunaire']);
  });

  it('should no longer request a tag when it is chosen again', () => {
    expect(
      toggleTag(criteria({ requestedTagIds: ['lunaire', 'pop'] }), 'requested', 'lunaire').requestedTagIds,
    ).toEqual(['pop']);
  });

  it('should exclude a tag when it is chosen in the group « Sans ces étiquettes »', () => {
    expect(toggleTag(criteria(), 'excluded', 'vrille').excludedTagIds).toEqual(['vrille']);
  });

  it('should leave the criteria unchanged when a tag requested is to be excluded too', () => {
    const requested = criteria({ requestedTagIds: ['lunaire'] });

    expect(toggleTag(requested, 'excluded', 'lunaire')).toBe(requested);
  });

  it('should tell whether a tag is requested, excluded or neither', () => {
    const chosen = criteria({ requestedTagIds: ['lunaire'], excludedTagIds: ['vrille'] });

    expect([
      tagCriterionOf(chosen, 'lunaire'),
      tagCriterionOf(chosen, 'vrille'),
      tagCriterionOf(chosen, 'pop'),
    ]).toEqual(['requested', 'excluded', null]);
  });

  it('should drop the tags no longer in the list when the API refuses them, keeping the other criteria', () => {
    const chosen = criteria({
      length: 1,
      requestedTagIds: ['lunaire', 'vrille'],
      excludedTagIds: ['vrille', 'whip'],
    });

    expect(withoutTags(chosen, ['vrille'])).toEqual(
      criteria({ length: 1, requestedTagIds: ['lunaire'], excludedTagIds: ['whip'] }),
    );
  });

  it('should count one transition less or more, from 1 to 10, with the − / + counter (story 9b)', () => {
    expect(moreTransitions(criteria({ length: 3 })).length).toBe(4);
    expect(fewerTransitions(criteria({ length: 3 })).length).toBe(2);
    expect(fewerTransitions(criteria({ length: 1 })).length).toBe(1);
    expect(moreTransitions(criteria({ length: 10 })).length).toBe(10);
  });
});

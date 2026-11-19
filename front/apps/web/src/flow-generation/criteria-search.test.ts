import { defaultFlowCriteria } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { criteriaOf, searchOf } from './criteria-search';

// Story 9 (UX-2): the criteria in the address of the page « Générer un flow ».

describe('criteria in the address', () => {
  it('should take the preselection when the address gives no criteria', () => {
    expect(criteriaOf('')).toEqual(defaultFlowCriteria);
  });

  it('should take the preselection for a length or a level off the scale', () => {
    expect(criteriaOf('?transitions=0&base=expert&flyer=advanced')).toEqual({
      ...defaultFlowCriteria,
      flyerCeiling: 'advanced',
    });
    expect(criteriaOf('?transitions=11').length).toBe(3);
  });

  it('should keep each tag once, a tag both requested and excluded being only requested', () => {
    expect(criteriaOf('?avec=lunaire&avec=lunaire&sans=lunaire&sans=vrille')).toEqual({
      ...defaultFlowCriteria,
      requestedTagIds: ['lunaire'],
      excludedTagIds: ['vrille'],
    });
  });

  it('should write the criteria it reads back', () => {
    const criteria = {
      length: 5,
      baseCeiling: 'intermediate',
      flyerCeiling: 'discovery',
      requestedTagIds: ['lunaire'],
      excludedTagIds: ['vrille', 'whip'],
    } as const;

    expect(searchOf(criteria)).toBe(
      '?transitions=5&base=intermediate&flyer=discovery&avec=lunaire&sans=vrille&sans=whip',
    );
    expect(criteriaOf(searchOf(criteria))).toEqual(criteria);
  });
});

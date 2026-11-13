import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import type { TransitionDescription } from '../shared-kernel/transition-description';
import type { TransitionName } from '../shared-kernel/transition-name';
import {
  transitionAdjustmentInputOf,
  transitionAdjustmentsOf,
  type TransitionAdjustmentInput,
} from './transition-adjustment';
import type { TransitionContent } from './transition-proposal';

const proposed: TransitionContent = {
  name: 'ninja star' as TransitionName,
  baseDifficulty: 'advanced',
  flyerDifficulty: 'intermediate',
  description: 'Vidéo : https://example.org/ninja-star' as TransitionDescription,
};

const asProposed = transitionAdjustmentInputOf(proposed);

describe('transitionAdjustmentInputOf', () => {
  it('should prefill the adjustment form with the proposed values, an absent name or description left empty', () => {
    expect(transitionAdjustmentInputOf({ ...proposed, name: null, description: null })).toEqual({
      name: '',
      baseDifficulty: 'advanced',
      flyerDifficulty: 'intermediate',
      description: '',
    });
  });
});

describe('transitionAdjustmentsOf', () => {
  it('should find no adjustment when the retained values are the proposed ones', () => {
    expect(transitionAdjustmentsOf(proposed, asProposed)).toEqual(ok([]));
  });

  it('should not take a value that differs only by superfluous spaces as an adjustment', () => {
    expect(transitionAdjustmentsOf(proposed, { ...asProposed, name: '  ninja   star ' })).toEqual(ok([]));
  });

  it('should take a change of case of the name as an adjustment', () => {
    expect(transitionAdjustmentsOf(proposed, { ...asProposed, name: 'Ninja Star' })).toEqual(
      ok([{ field: 'name', proposed: 'ninja star', retained: 'Ninja Star' }]),
    );
  });

  it('should give the adjusted values in the order of the form, proposed → retained', () => {
    const input: TransitionAdjustmentInput = {
      name: 'Ninja Star',
      baseDifficulty: 'advanced',
      flyerDifficulty: 'advanced',
      description: 'Rotation complète, retour en Star.',
    };

    expect(transitionAdjustmentsOf(proposed, input)).toEqual(
      ok([
        { field: 'name', proposed: 'ninja star', retained: 'Ninja Star' },
        { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'advanced' },
        {
          field: 'description',
          proposed: 'Vidéo : https://example.org/ninja-star',
          retained: 'Rotation complète, retour en Star.',
        },
      ]),
    );
  });

  it('should take a removed name or description as an adjustment to none', () => {
    expect(transitionAdjustmentsOf(proposed, { ...asProposed, name: ' ', description: '' })).toEqual(
      ok([
        { field: 'name', proposed: 'ninja star', retained: null },
        { field: 'description', proposed: 'Vidéo : https://example.org/ninja-star', retained: null },
      ]),
    );
  });

  it('should take a name given to a transition proposed without one as an adjustment', () => {
    const unnamed = { ...proposed, name: null };

    expect(
      transitionAdjustmentsOf(unnamed, { ...transitionAdjustmentInputOf(unnamed), name: 'Ninja Star' }),
    ).toEqual(ok([{ field: 'name', proposed: null, retained: 'Ninja Star' }]));
  });

  it('should report the content errors of the retained values, as for a proposal', () => {
    expect(
      transitionAdjustmentsOf(proposed, { ...asProposed, name: '---', description: 'x'.repeat(501) }),
    ).toEqual(
      fail([
        { field: 'name', code: 'transition.name-without-letter-or-digit' },
        { field: 'description', code: 'transition.description-too-long' },
      ]),
    );
  });
});

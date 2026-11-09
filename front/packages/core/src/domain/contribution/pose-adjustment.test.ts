import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import type { PoseName } from '../shared-kernel/pose-name';
import type { PoseProposalInput, ValidPoseProposal } from './pose-proposal';
import { adjustmentsOf } from './pose-adjustment';

const throne: ValidPoseProposal = {
  name: 'Throne' as PoseName,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'intermediate',
  canStartFlow: true,
  canEndFlow: true,
};

/** The adjustment form starts with the proposed values. */
const unchanged: PoseProposalInput = { ...throne };

describe('adjustmentsOf', () => {
  it('should find no adjustment when the retained values are the proposed ones', () => {
    expect(adjustmentsOf(throne, unchanged)).toEqual(ok([]));
  });

  it('should find the adjustment of the flyer difficulty when the validator corrects it', () => {
    expect(adjustmentsOf(throne, { ...unchanged, flyerDifficulty: 'discovery' })).toEqual(
      ok([{ field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' }]),
    );
  });

  // R9 bis: values are compared once normalised.
  it('should find no adjustment when the name only differs by superfluous spaces', () => {
    expect(adjustmentsOf(throne, { ...unchanged, name: '  Throne ' })).toEqual(ok([]));
  });

  it('should find an adjustment of the name when only its case changes', () => {
    const throneInLowerCase = { ...throne, name: 'throne' as PoseName };

    expect(adjustmentsOf(throneInLowerCase, { ...unchanged, name: 'Throne' })).toEqual(
      ok([{ field: 'name', proposed: 'throne', retained: 'Throne' }]),
    );
  });

  it('should give the normalised retained name when the corrected name has superfluous spaces', () => {
    expect(adjustmentsOf(throne, { ...unchanged, name: ' High   Throne ' })).toEqual(
      ok([{ field: 'name', proposed: 'Throne', retained: 'High Throne' }]),
    );
  });

  it('should report the content errors of the retained values when they break a rule of a pose', () => {
    expect(adjustmentsOf(throne, { ...unchanged, name: '---' })).toEqual(
      fail([{ field: 'name', code: 'pose.name-required' }]),
    );
  });

  it('should list every adjustment in the order of the form when the validator corrects every value', () => {
    const retained: PoseProposalInput = {
      name: 'High Throne',
      baseDifficulty: 'intermediate',
      flyerDifficulty: 'advanced',
      canStartFlow: false,
      canEndFlow: false,
    };

    expect(adjustmentsOf(throne, retained)).toEqual(
      ok([
        { field: 'name', proposed: 'Throne', retained: 'High Throne' },
        { field: 'baseDifficulty', proposed: 'beginner', retained: 'intermediate' },
        { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'advanced' },
        { field: 'canStartFlow', proposed: true, retained: false },
        { field: 'canEndFlow', proposed: true, retained: false },
      ]),
    );
  });
});

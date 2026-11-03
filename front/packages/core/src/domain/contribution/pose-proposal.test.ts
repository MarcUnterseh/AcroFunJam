import { describe, expect, it } from 'vitest';
import {
  emptyPoseProposalInput,
  publishesDirectly,
  validatePoseProposal,
  type PoseProposalInput,
} from './pose-proposal';

const throne: PoseProposalInput = {
  name: '  Throne ',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
};

describe('validatePoseProposal', () => {
  it('should give the proposal with its normalised name when every answer is valid', () => {
    expect(validatePoseProposal(throne)).toEqual({
      ok: true,
      value: {
        name: 'Throne',
        baseDifficulty: 'beginner',
        flyerDifficulty: 'discovery',
        canStartFlow: true,
        canEndFlow: false,
      },
    });
  });

  it('should keep "no" as an answer when a flow boundary is false', () => {
    const result = validatePoseProposal({ ...throne, canStartFlow: false, canEndFlow: false });

    expect(result.ok).toBe(true);
  });

  it.each<[Partial<PoseProposalInput>, string, string]>([
    [{ name: '   ' }, 'name', 'pose.name-required'],
    [{ name: 'x'.repeat(61) }, 'name', 'pose.name-too-long'],
    [{ baseDifficulty: null }, 'baseDifficulty', 'pose.base-difficulty-required'],
    [{ flyerDifficulty: null }, 'flyerDifficulty', 'pose.flyer-difficulty-required'],
    [{ canStartFlow: null }, 'canStartFlow', 'pose.can-start-flow-required'],
    [{ canEndFlow: null }, 'canEndFlow', 'pose.can-end-flow-required'],
  ])('should report the error of the API when %o', (change, field, code) => {
    expect(validatePoseProposal({ ...throne, ...change })).toEqual({ ok: false, error: [{ field, code }] });
  });

  it('should report every error at once, in the order of the form, when nothing is answered', () => {
    expect(validatePoseProposal(emptyPoseProposalInput)).toEqual({
      ok: false,
      error: [
        { field: 'name', code: 'pose.name-required' },
        { field: 'baseDifficulty', code: 'pose.base-difficulty-required' },
        { field: 'flyerDifficulty', code: 'pose.flyer-difficulty-required' },
        { field: 'canStartFlow', code: 'pose.can-start-flow-required' },
        { field: 'canEndFlow', code: 'pose.can-end-flow-required' },
      ],
    });
  });
});

describe('emptyPoseProposalInput', () => {
  it('should leave every answer open when the form starts, with no preselected choice', () => {
    expect(emptyPoseProposalInput).toEqual({
      name: '',
      baseDifficulty: null,
      flyerDifficulty: null,
      canStartFlow: null,
      canEndFlow: null,
    });
  });
});

describe('publishesDirectly', () => {
  it('should be false when the person may only propose (user)', () => {
    expect(publishesDirectly(['propose'])).toBe(false);
  });

  it.each([[['propose', 'validate-proposals']], [['propose', 'validate-proposals', 'manage-roles']]])(
    'should be true when the person may validate proposals (%j)',
    (capabilities) => {
      expect(publishesDirectly(capabilities)).toBe(true);
    },
  );
});

import { describe, expect, it } from 'vitest';
import { fail, ok } from '../common/result';
import {
  emptyTransitionProposalInput,
  validateTransitionProposal,
  type TransitionProposalInput,
} from './transition-proposal';

const ninjaStar: TransitionProposalInput = {
  fromPoseId: 'pose-star',
  toPoseId: 'pose-star',
  name: '  Ninja   Star ',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: '  Vidéo : https://example.org/ninja-star  ',
};

describe('emptyTransitionProposalInput', () => {
  it('should start from the pose consulted, every other answer to give', () => {
    expect(emptyTransitionProposalInput('pose-throne')).toEqual({
      fromPoseId: 'pose-throne',
      toPoseId: '',
      name: '',
      baseDifficulty: null,
      flyerDifficulty: null,
      description: '',
    });
  });
});

describe('validateTransitionProposal', () => {
  it('should give the transition to send, its name and description normalised', () => {
    expect(validateTransitionProposal(ninjaStar)).toEqual(
      ok({
        fromPoseId: 'pose-star',
        toPoseId: 'pose-star',
        name: 'Ninja Star',
        baseDifficulty: 'advanced',
        flyerDifficulty: 'advanced',
        description: 'Vidéo : https://example.org/ninja-star',
      }),
    );
  });

  it('should accept a transition without a name nor a description', () => {
    const result = validateTransitionProposal({ ...ninjaStar, name: ' ', description: '' });

    expect(result).toEqual(ok(expect.objectContaining({ name: null, description: null })));
  });

  it('should report every error at once, in the order of the form', () => {
    const result = validateTransitionProposal({
      fromPoseId: '',
      toPoseId: '',
      name: '---',
      baseDifficulty: null,
      flyerDifficulty: null,
      description: 'x'.repeat(501),
    });

    expect(result).toEqual(
      fail([
        { field: 'fromPoseId', code: 'contribution.from-pose-required' },
        { field: 'toPoseId', code: 'contribution.to-pose-required' },
        { field: 'name', code: 'transition.name-without-letter-or-digit' },
        { field: 'baseDifficulty', code: 'pose.base-difficulty-required' },
        { field: 'flyerDifficulty', code: 'pose.flyer-difficulty-required' },
        { field: 'description', code: 'transition.description-too-long' },
      ]),
    );
  });

  it('should report a name too long under the name', () => {
    expect(validateTransitionProposal({ ...ninjaStar, name: 'x'.repeat(61) })).toEqual(
      fail([{ field: 'name', code: 'transition.name-too-long' }]),
    );
  });
});

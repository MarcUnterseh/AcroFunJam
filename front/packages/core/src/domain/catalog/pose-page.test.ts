import { describe, expect, it } from 'vitest';
import { isSamePose, type LinkedTransition, type PosePage } from './pose-page';

const star: PosePage = {
  id: 'pose-star',
  name: 'Star',
  baseDifficulty: 'intermediate',
  flyerDifficulty: 'intermediate',
  canStartFlow: false,
  canEndFlow: false,
  transitionsFrom: [],
  transitionsTo: [],
};

const linked = (otherPose: { id: string; name: string }): LinkedTransition => ({
  id: 'transition-1',
  otherPose,
  name: 'Ninja Star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: null,
  tags: [{ id: 'tag-inversion', name: 'inversion', description: 'Le flyer passe tête en bas.' }],
});

describe('isSamePose', () => {
  it('should tell a washing machine when the other pose of the transition is the pose of the page', () => {
    expect(isSamePose(star, linked({ id: 'pose-star', name: 'Star' }))).toBe(true);
  });

  it('should not when the transition leads to another pose, even of the same name', () => {
    expect(isSamePose(star, linked({ id: 'pose-other-star', name: 'Star' }))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { flowBoundaryAnswer, poseCountLabel } from './catalog-labels';

describe('poseCountLabel', () => {
  it('should use the singular when the catalog has one pose', () => {
    expect(poseCountLabel(1)).toBe('1 pose, par ordre alphabétique');
  });

  it.each([2, 12])('should use the plural when the catalog has %i poses', (count) => {
    expect(poseCountLabel(count)).toBe(`${count} poses, par ordre alphabétique`);
  });
});

describe('flowBoundaryAnswer', () => {
  it('should answer "Oui" when the pose can start or end a flow', () => {
    expect(flowBoundaryAnswer(true)).toBe('Oui');
  });

  it('should answer "Non" when the pose cannot start or end a flow', () => {
    expect(flowBoundaryAnswer(false)).toBe('Non');
  });
});

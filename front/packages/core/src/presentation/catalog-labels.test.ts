import { describe, expect, it } from 'vitest';
import type { DifficultyLevel } from '../domain/catalog/difficulty-level';
import { difficultyLevelName, flowBoundaryAnswer, poseCountLabel } from './catalog-labels';

describe('poseCountLabel', () => {
  it('should use the singular when the catalog has one pose', () => {
    expect(poseCountLabel(1)).toBe('1 pose, par ordre alphabétique');
  });

  it.each([2, 12])('should use the plural when the catalog has %i poses', (count) => {
    expect(poseCountLabel(count)).toBe(`${count} poses, par ordre alphabétique`);
  });
});

describe('difficultyLevelName', () => {
  it.each<[DifficultyLevel, string]>([
    ['discovery', 'Découverte'],
    ['beginner', 'Débutant'],
    ['intermediate', 'Intermédiaire'],
    ['advanced', 'Avancé'],
  ])('should name %s "%s" when shown on its own', (level, name) => {
    expect(difficultyLevelName(level)).toBe(name);
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

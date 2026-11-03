import { describe, expect, it } from 'vitest';
import type { DifficultyLevel } from '../../domain/shared-kernel/difficulty-level';
import { difficultyLevelName } from './difficulty-level-labels';

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

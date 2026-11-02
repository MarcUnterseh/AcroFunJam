import { describe, expect, it } from 'vitest';
import { difficultyLevelLabel, type DifficultyLevel } from './difficulty-level';

describe('difficultyLevelLabel', () => {
  it.each<[DifficultyLevel, string]>([
    ['discovery', 'découverte'],
    ['beginner', 'débutant'],
    ['intermediate', 'intermédiaire'],
    ['advanced', 'avancé'],
  ])('should label %s as "%s" when displayed in French', (level, label) => {
    expect(difficultyLevelLabel(level)).toBe(label);
  });
});

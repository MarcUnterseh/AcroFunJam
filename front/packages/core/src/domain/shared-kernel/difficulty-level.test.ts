import { describe, expect, it } from 'vitest';
import { difficultyRank, difficultyScale, type DifficultyLevel } from './difficulty-level';

describe('difficultyScale', () => {
  it('should order the levels from the most accessible to the most demanding', () => {
    expect(difficultyScale).toEqual(['discovery', 'beginner', 'intermediate', 'advanced']);
  });
});

describe('difficultyRank', () => {
  it.each<[DifficultyLevel, number]>([
    ['discovery', 1],
    ['beginner', 2],
    ['intermediate', 3],
    ['advanced', 4],
  ])('should rank %s at %i on the scale', (level, rank) => {
    expect(difficultyRank(level)).toBe(rank);
  });
});

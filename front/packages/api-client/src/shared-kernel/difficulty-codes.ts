import type { DifficultyLevel } from '@acrofunjam/core';

const difficultyCodes: readonly unknown[] = [
  'discovery',
  'beginner',
  'intermediate',
  'advanced',
] satisfies readonly DifficultyLevel[];

/**
 * A difficulty code of the contract the site knows. The generated types describe the contract, but the server may
 * evolve before the client is regenerated: every adapter checks the codes it receives.
 */
export const isDifficultyCode = (code: unknown): code is DifficultyLevel => difficultyCodes.includes(code);

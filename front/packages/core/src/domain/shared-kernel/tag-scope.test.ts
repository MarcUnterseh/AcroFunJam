import { describe, expect, it } from 'vitest';
import { tagAppliesToPoses, tagAppliesToTransitions } from './tag-scope';

// Story 9a: what a tag applies to (ADR 0035).

describe('what a tag applies to', () => {
  it.each([
    ['poses', true, false],
    ['transitions', false, true],
    ['poses-and-transitions', true, true],
  ] as const)(
    'should tell whether a tag applying to %s applies to poses and to transitions',
    (scope, poses, transitions) => {
      expect(tagAppliesToPoses({ scope })).toBe(poses);
      expect(tagAppliesToTransitions({ scope })).toBe(transitions);
    },
  );
});

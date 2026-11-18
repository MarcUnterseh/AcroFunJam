import type { KeptTransitionInput } from '@acrofunjam/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createSessionTransitionInputStore } from './session-transition-input-store';

const kept: KeptTransitionInput = {
  owner: 'alice@example.org',
  input: {
    fromPoseId: 'pose-star',
    toPoseId: 'pose-star',
    name: 'Ninja Star',
    baseDifficulty: 'advanced',
    flyerDifficulty: null,
    description: 'Vidéo :\nhttps://example.org/ninja-star',
    tags: [{ id: 'tag-inversion', name: 'inversion' }],
  },
};

afterEach(() => sessionStorage.clear());

describe('createSessionTransitionInputStore', () => {
  it('should give back what was saved in the tab for a pose of origin, with its owner', () => {
    const store = createSessionTransitionInputStore(sessionStorage);

    store.save('pose-throne', kept);

    expect(store.load('pose-throne')).toEqual(kept);
    expect(store.load('pose-bird')).toBeNull();
  });

  it('should forget the input of a pose of origin only, or of every pose on sign-out', () => {
    const store = createSessionTransitionInputStore(sessionStorage);
    store.save('pose-throne', kept);
    store.save('pose-bird', kept);
    sessionStorage.setItem('afj-revision-input:pose-throne', '{}');

    store.clear('pose-throne');
    expect(store.load('pose-throne')).toBeNull();
    expect(store.load('pose-bird')).toEqual(kept);

    store.clearAll();
    expect(store.load('pose-bird')).toBeNull();
    expect(sessionStorage.getItem('afj-revision-input:pose-throne')).toBe('{}');
  });

  it('should ignore what it cannot read, and not trust an unknown level', () => {
    const store = createSessionTransitionInputStore(sessionStorage);
    sessionStorage.setItem('afj-transition-input:pose-throne', '{not json');
    sessionStorage.setItem(
      'afj-transition-input:pose-bird',
      JSON.stringify({ ...kept, input: { ...kept.input, baseDifficulty: 'expert' } }),
    );

    expect(store.load('pose-throne')).toBeNull();
    expect(store.load('pose-bird')?.input.baseDifficulty).toBeNull();
  });
});

import type { KeptRevisionInput } from '@acrofunjam/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createSessionRevisionInputStore } from './session-revision-input-store';

const kept: KeptRevisionInput = {
  owner: 'alice@example.org',
  input: {
    values: {
      name: 'Throne',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
      canStartFlow: true,
      canEndFlow: false,
      tags: [],
    },
    message: 'Plus facile côté flyer.',
  },
};

/** Storage whose every access fails, like a blocked storage or some private browsing modes. */
const blocked: Storage = {
  length: 0,
  clear: () => {
    throw new Error('blocked');
  },
  getItem: () => {
    throw new Error('blocked');
  },
  key: () => null,
  removeItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

afterEach(() => sessionStorage.clear());

describe('createSessionRevisionInputStore', () => {
  it('should give back what was saved in the tab for a pose, with its owner', () => {
    const store = createSessionRevisionInputStore(sessionStorage);

    store.save('pose-throne', kept);

    expect(store.load('pose-throne')).toEqual(kept);
  });

  it('should keep the input of each pose apart, under its own key', () => {
    const store = createSessionRevisionInputStore(sessionStorage);

    store.save('pose-throne', kept);

    expect(store.load('pose-bird')).toBeNull();
    expect(sessionStorage.getItem('afj-revision-input:pose-throne')).not.toBeNull();
    expect(sessionStorage.getItem('afj-proposal-input')).toBeNull();
  });

  it('should forget the input of a pose only', () => {
    const store = createSessionRevisionInputStore(sessionStorage);
    store.save('pose-throne', kept);
    store.save('pose-bird', kept);

    store.clear('pose-throne');

    expect(store.load('pose-throne')).toBeNull();
    expect(store.load('pose-bird')).toEqual(kept);
  });

  it('should forget the input of every pose on sign-out', () => {
    const store = createSessionRevisionInputStore(sessionStorage);
    store.save('pose-throne', kept);
    store.save('pose-bird', kept);
    sessionStorage.setItem('afj-proposal-input', '{}');

    store.clearAll();

    expect(store.load('pose-throne')).toBeNull();
    expect(store.load('pose-bird')).toBeNull();
    expect(sessionStorage.getItem('afj-proposal-input')).toBe('{}');
  });

  it('should ignore what it cannot read: a value of an older site is not trusted', () => {
    sessionStorage.setItem('afj-revision-input:pose-throne', JSON.stringify({ owner: 'alice@example.org' }));

    expect(createSessionRevisionInputStore(sessionStorage).load('pose-throne')).toBeNull();
  });

  it('should be safe when the storage is unavailable', () => {
    const store = createSessionRevisionInputStore(blocked);

    expect(() => store.save('pose-throne', kept)).not.toThrow();
    expect(store.load('pose-throne')).toBeNull();
    expect(() => store.clear('pose-throne')).not.toThrow();
    expect(() => store.clearAll()).not.toThrow();
  });
});

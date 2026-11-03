import type { KeptProposalInput } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createSessionProposalInputStore } from './session-proposal-input-store';

const kept: KeptProposalInput = {
  owner: 'alice@example.org',
  input: {
    name: 'Throne',
    baseDifficulty: 'beginner',
    flyerDifficulty: null,
    canStartFlow: false,
    canEndFlow: null,
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

const storedAs = (value: unknown) => sessionStorage.setItem('afj-proposal-input', JSON.stringify(value));

describe('createSessionProposalInputStore', () => {
  it('should give back what was saved in the tab, with its owner', () => {
    const store = createSessionProposalInputStore(sessionStorage);

    store.save(kept);

    expect(createSessionProposalInputStore(sessionStorage).load()).toEqual(kept);
  });

  it('should give nothing once cleared', () => {
    const store = createSessionProposalInputStore(sessionStorage);
    store.save(kept);

    store.clear();

    expect(store.load()).toBeNull();
  });

  it.each([
    ['an input without owner', kept.input],
    ['a name that is not text', { owner: 'alice@example.org', input: { name: 42 } }],
    ['an owner that is not text', { owner: 1, input: kept.input }],
  ])('should give nothing when the stored value is %s', (_case, value) => {
    storedAs(value);

    expect(createSessionProposalInputStore(sessionStorage).load()).toBeNull();
  });

  it('should give nothing when the stored value is not JSON', () => {
    sessionStorage.setItem('afj-proposal-input', 'not json');

    expect(createSessionProposalInputStore(sessionStorage).load()).toBeNull();
  });

  it('should ignore an unknown level rather than trust it', () => {
    storedAs({ ...kept, input: { ...kept.input, baseDifficulty: 'expert' } });

    expect(createSessionProposalInputStore(sessionStorage).load()).toEqual({
      ...kept,
      input: { ...kept.input, baseDifficulty: null },
    });
  });

  it('should neither fail nor give anything when the storage is unavailable', () => {
    const store = createSessionProposalInputStore(blocked);

    expect(() => store.save(kept)).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toBeNull();
  });
});

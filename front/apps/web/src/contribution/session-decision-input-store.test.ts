import type { KeptDecisionInputs } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createSessionDecisionInputStore } from './session-decision-input-store';

const kept: KeptDecisionInputs = {
  owner: 'bruno@example.org',
  decisions: {
    'proposal-1': { kind: 'rejection', reason: "Ce n'est pas une pose tenable." },
    'proposal-2': {
      kind: 'acceptance',
      input: {
        name: 'Throne',
        baseDifficulty: 'beginner',
        flyerDifficulty: 'discovery',
        canStartFlow: true,
        canEndFlow: false,
      },
      note: 'Throne se découvre dès la première séance côté flyer.',
    },
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

const storedAs = (value: unknown) => sessionStorage.setItem('afj-decision-inputs', JSON.stringify(value));
const loaded = () => createSessionDecisionInputStore(sessionStorage).load();

describe('createSessionDecisionInputStore', () => {
  it('should give back what was saved in the tab, with its owner', () => {
    const store = createSessionDecisionInputStore(sessionStorage);

    store.save(kept);

    expect(createSessionDecisionInputStore(sessionStorage).load()).toEqual(kept);
  });

  it('should give nothing once cleared', () => {
    const store = createSessionDecisionInputStore(sessionStorage);
    store.save(kept);

    store.clear();

    expect(store.load()).toBeNull();
  });

  it.each([
    ['not JSON', 'not json'],
    ['decisions without owner', JSON.stringify({ decisions: kept.decisions })],
    ['an owner without decisions', JSON.stringify({ owner: kept.owner })],
  ])('should give nothing when the stored value is %s', (_case, raw) => {
    sessionStorage.setItem('afj-decision-inputs', raw);

    expect(loaded()).toBeNull();
  });

  it('should ignore a decision it cannot read, and keep the others', () => {
    storedAs({
      owner: kept.owner,
      decisions: {
        ...kept.decisions,
        'proposal-3': { kind: 'withdrawal' },
        'proposal-4': { kind: 'rejection', reason: 42 },
        'proposal-5': { kind: 'acceptance', input: { name: 'Bird' }, note: 7 },
      },
    });

    expect(loaded()).toEqual(kept);
  });

  it('should ignore an unknown level of a kept acceptance rather than trust it', () => {
    const acceptance = kept.decisions['proposal-2']!;
    storedAs({
      owner: kept.owner,
      decisions: {
        'proposal-2': {
          ...acceptance,
          input: { name: 'Throne', baseDifficulty: 'expert', canStartFlow: 'yes' },
        },
      },
    });

    expect(loaded()?.decisions['proposal-2']).toEqual({
      kind: 'acceptance',
      input: {
        name: 'Throne',
        baseDifficulty: null,
        flyerDifficulty: null,
        canStartFlow: null,
        canEndFlow: null,
      },
      note: 'Throne se découvre dès la première séance côté flyer.',
    });
  });

  it('should neither fail nor give anything when the storage is unavailable', () => {
    const store = createSessionDecisionInputStore(blocked);

    expect(() => store.save(kept)).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toBeNull();
  });
});

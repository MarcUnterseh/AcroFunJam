import { defaultFlowCriteria, type ShownFlow } from '@acrofunjam/core';
import { apiAddressOf } from './api-address';
import {
  createKvLastShownFlowStore,
  lastShownFlowKey,
  type KeyValueStorage,
} from './kv-last-shown-flow-store';

// Story 9b, ADR 0038: the address of the API per build profile, and the last flow shown kept on the device.

const shown: ShownFlow = {
  criteria: { ...defaultFlowCriteria, length: 1, requestedTagIds: ['lunaire'] },
  flow: {
    start: {
      id: 'throne',
      name: 'Throne',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
      tags: [],
    },
    steps: [
      {
        number: 1,
        transition: {
          id: 't1',
          name: 'Pop to Bird',
          baseDifficulty: 'intermediate',
          flyerDifficulty: 'intermediate',
          description: 'La base propulse le flyer depuis Throne, puis le rattrape en Bird.',
          tags: [{ id: 'pop', name: 'pop' }],
        },
        isWashingMachine: false,
        arrival: {
          id: 'bird',
          name: 'Bird',
          baseDifficulty: 'beginner',
          flyerDifficulty: 'beginner',
          tags: [],
        },
      },
    ],
  },
};

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  getItem = async (key: string) => this.values.get(key) ?? null;
  setItem = async (key: string, value: string) => {
    this.values.set(key, value);
  };
}

describe('apiAddressOf', () => {
  it('should give the address of the API without its trailing slash when it is an http(s) address', () => {
    expect(apiAddressOf('https://api.acrofunjam.test/')).toBe('https://api.acrofunjam.test');
    expect(apiAddressOf('http://10.0.2.2:5252')).toBe('http://10.0.2.2:5252');
  });

  it.each([undefined, '', 'not an address', 'ftp://api.test'])(
    'should refuse a missing or invalid address (%s)',
    (value) => {
      expect(() => apiAddressOf(value)).toThrow(/EXPO_PUBLIC_API_URL/);
    },
  );
});

describe('kvLastShownFlowStore', () => {
  it('should keep the flow shown and its criteria, descriptions included, and read them back', async () => {
    const store = createKvLastShownFlowStore(new MemoryStorage());

    await store.keep(shown);

    expect(await store.load()).toEqual(shown);
  });

  it('should keep no flow until one is shown', async () => {
    expect(await createKvLastShownFlowStore(new MemoryStorage()).load()).toBeNull();
  });

  it.each([
    ['not JSON', '{'],
    ['another version', JSON.stringify({ version: 2, flow: shown.flow, criteria: shown.criteria })],
    [
      'a flow without steps',
      JSON.stringify({ version: 1, flow: { start: shown.flow.start }, criteria: shown.criteria }),
    ],
  ])('should read no flow when the value kept is %s', async (_case, value) => {
    const storage = new MemoryStorage();
    storage.values.set(lastShownFlowKey, value);

    expect(await createKvLastShownFlowStore(storage).load()).toBeNull();
  });
});

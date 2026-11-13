import { describe, expect, it } from 'vitest';
import { keepKeyedInput, restoreKeyedInput } from './keyed-input';
import type { KeptInput, KeyedInputStore } from './KeyedInputStorePort';

class MemoryStore implements KeyedInputStore<string> {
  readonly kept = new Map<string, KeptInput<string>>();
  load = (key: string) => this.kept.get(key) ?? null;
  save = (key: string, kept: KeptInput<string>) => void this.kept.set(key, kept);
  clear = (key: string) => void this.kept.delete(key);
}

describe('keepKeyedInput', () => {
  it('should keep the input under its key, with its owner', () => {
    const store = new MemoryStore();

    keepKeyedInput(store, 'pose-throne', 'Ninja Star', 'alice@example.org');

    expect(store.load('pose-throne')).toEqual({ owner: 'alice@example.org', input: 'Ninja Star' });
    expect(store.load('pose-bird')).toBeNull();
  });
});

describe('restoreKeyedInput', () => {
  it('should give the input of the key back once, to its owner', () => {
    const store = new MemoryStore();
    keepKeyedInput(store, 'pose-throne', 'Ninja Star', 'alice@example.org');

    expect(restoreKeyedInput(store, 'pose-throne', 'alice@example.org')).toBe('Ninja Star');
    expect(restoreKeyedInput(store, 'pose-throne', 'alice@example.org')).toBeNull();
  });

  it('should forget the input of someone else (shared device)', () => {
    const store = new MemoryStore();
    keepKeyedInput(store, 'pose-throne', 'Ninja Star', 'chloe@example.org');

    expect(restoreKeyedInput(store, 'pose-throne', 'alice@example.org')).toBeNull();
    expect(store.load('pose-throne')).toBeNull();
  });
});

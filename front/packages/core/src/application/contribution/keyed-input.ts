import type { KeyedInputStore } from './KeyedInputStorePort';

/** Keeps the input of a form for its owner and its key, until the person finds it again (ADR 0019). */
export const keepKeyedInput = <T>(store: KeyedInputStore<T>, key: string, input: T, owner: string): void =>
  store.save(key, { owner, input });

/**
 * The kept input of the key, given once (then forgotten), to its owner only: the input of someone else is forgotten
 * (shared device).
 */
export const restoreKeyedInput = <T>(store: KeyedInputStore<T>, key: string, owner: string): T | null => {
  const kept = store.load(key);
  if (!kept) return null;
  store.clear(key);
  return kept.owner === owner ? kept.input : null;
};

import type { KeptInput, KeyedInputStore } from '@acrofunjam/core';
import { attempt, isRecord } from './kept-input-parsing';

/**
 * KeyedInputStore on sessionStorage (ADR 0019): the input of a form stays in this tab, one key per pose
 * (`<prefix><key>`), and disappears with it; stored with its owner. What was stored may come from an older version of
 * the site: `parse` reads the input, anything unexpected is ignored. Signing out forgets every key of the prefix.
 */
export const createKeyedSessionStore = <T>(
  storage: Storage,
  prefix: string,
  parse: (input: unknown) => T | null,
): KeyedInputStore<T> & { readonly clearAll: () => void } => {
  const keyOf = (key: string) => `${prefix}${key}`;
  const read = (raw: string | null): KeptInput<T> | null => {
    if (raw === null) return null;
    const value: unknown = attempt(() => JSON.parse(raw), null);
    if (!isRecord(value) || typeof value['owner'] !== 'string') return null;
    const input = parse(value['input']);
    return input && { owner: value['owner'], input };
  };
  return {
    load: (key) => read(attempt(() => storage.getItem(keyOf(key)), null)),
    save: (key, kept) => attempt(() => storage.setItem(keyOf(key), JSON.stringify(kept)), undefined),
    clear: (key) => attempt(() => storage.removeItem(keyOf(key)), undefined),
    clearAll: () =>
      attempt(() => {
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
          (key): key is string => key?.startsWith(prefix) ?? false,
        );
        for (const key of keys) storage.removeItem(key);
      }, undefined),
  };
};

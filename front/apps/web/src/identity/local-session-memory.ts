import type { SessionMemory } from '@acrofunjam/core';

const key = 'afj-had-session';

const attempt = <T>(action: () => T, fallback: T): T => {
  try {
    return action();
  } catch {
    return fallback; // private browsing, blocked storage: only the "expired" banner is lost (ADR 0013)
  }
};

/** SessionMemory on localStorage: a non-secret hint, shared by the tabs through the "storage" event (ADR 0013). */
export const createLocalSessionMemory = (storage: Storage, events: Window): SessionMemory => ({
  wasSignedIn: () => attempt(() => storage.getItem(key) === '1', false),
  remember: () => attempt(() => storage.setItem(key, '1'), undefined),
  forget: () => attempt(() => storage.removeItem(key), undefined),
  onChange: (listener) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    events.addEventListener('storage', onStorage);
    return () => events.removeEventListener('storage', onStorage);
  },
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalSessionMemory } from './local-session-memory';

afterEach(() => localStorage.clear());

describe('createLocalSessionMemory', () => {
  it('should remember and forget that a session existed in this browser', () => {
    const memory = createLocalSessionMemory(localStorage, window);

    expect(memory.wasSignedIn()).toBe(false);
    memory.remember();
    expect(memory.wasSignedIn()).toBe(true);
    memory.forget();
    expect(memory.wasSignedIn()).toBe(false);
  });

  it('should store a hint only, never an address nor a token', () => {
    createLocalSessionMemory(localStorage, window).remember();

    expect(Object.values({ ...localStorage })).toEqual(['1']);
  });

  it('should notify when another tab changes the hint', () => {
    const memory = createLocalSessionMemory(localStorage, window);
    const listener = vi.fn();
    const unsubscribe = memory.onChange(listener);

    window.dispatchEvent(new StorageEvent('storage', { key: 'afj-had-session' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: 'afj-had-session' }));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should behave as a browser without memory when the storage is unavailable', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const memory = createLocalSessionMemory(blocked, window);

    expect(() => memory.remember()).not.toThrow();
    expect(memory.wasSignedIn()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { accountInitial } from './account-initial';

describe('accountInitial', () => {
  it('should give the first letter of the address in capitals when signed in', () => {
    expect(accountInitial('alice@example.org')).toBe('A');
  });

  it('should keep an accented first letter whole when the address starts with it', () => {
    expect(accountInitial('éloïse@example.org')).toBe('É');
  });

  it('should skip leading spaces when the address has some', () => {
    expect(accountInitial('  bruno@example.org')).toBe('B');
  });

  it('should give nothing when the address is empty', () => {
    expect(accountInitial('')).toBe('');
  });
});

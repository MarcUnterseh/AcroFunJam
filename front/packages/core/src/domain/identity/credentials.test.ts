import { describe, expect, it } from 'vitest';
import { createEmailAddress, passwordPolicy, validateRegistration, validateSignIn } from './credentials';

describe('createEmailAddress', () => {
  it('should trim the address when it is surrounded by spaces', () => {
    expect(createEmailAddress('  alice@example.org ')).toEqual({ ok: true, value: 'alice@example.org' });
  });

  it('should require an address when it is empty', () => {
    expect(createEmailAddress('   ')).toEqual({ ok: false, error: 'identity.email-required' });
  });

  // Same rule as the API (EmailAddressAttribute), never stricter: the site must not block accounts the API accepts.
  it.each(['alice', '@example.org', 'alice@', 'alice@@example.org'])(
    'should reject "%s" when it is not an address',
    (raw) => {
      expect(createEmailAddress(raw)).toEqual({ ok: false, error: 'identity.email-invalid' });
    },
  );

  it('should accept an address without a dot in its domain when the API accepts it', () => {
    expect(createEmailAddress('alice@localhost').ok).toBe(true);
  });
});

describe('validateRegistration', () => {
  it('should accept a pass phrase of at least the minimum length when registering', () => {
    expect(passwordPolicy.minLength).toBe(10);
    expect(validateRegistration({ email: 'alice@example.org', password: 'throne2026' })).toEqual({
      ok: true,
      value: { email: 'alice@example.org', password: 'throne2026' },
    });
  });

  it('should refuse a password shorter than the minimum length when registering', () => {
    expect(validateRegistration({ email: 'alice@example.org', password: 'Throne-26' })).toEqual({
      ok: false,
      error: [{ field: 'password', code: 'identity.password-too-short' }],
    });
  });

  it('should report every field error at once when several fields are invalid', () => {
    expect(validateRegistration({ email: '', password: '' })).toEqual({
      ok: false,
      error: [
        { field: 'email', code: 'identity.email-required' },
        { field: 'password', code: 'identity.password-required' },
      ],
    });
  });

  it('should never truncate the password when it is long', () => {
    const password = 'une très longue phrase de passe, avec des espaces  ';
    const result = validateRegistration({ email: 'alice@example.org', password });
    expect(result.ok && result.value.password).toBe(password);
  });
});

describe('validateSignIn', () => {
  it('should not check the password length when signing in', () => {
    expect(validateSignIn({ email: 'alice@example.org', password: 'court' }).ok).toBe(true);
  });

  it('should require the password when signing in', () => {
    expect(validateSignIn({ email: 'alice@example.org', password: '' })).toEqual({
      ok: false,
      error: [{ field: 'password', code: 'identity.password-required' }],
    });
  });
});

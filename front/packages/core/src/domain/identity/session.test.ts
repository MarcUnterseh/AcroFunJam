import { describe, expect, it } from 'vitest';
import { initialSession, noticeDismissed, sessionLoaded, signedIn, signedOut } from './session';

describe('session', () => {
  it('should start by checking the session when the site opens', () => {
    expect(initialSession).toEqual({ status: 'checking' });
  });

  it('should be signed in with the address when an account is loaded', () => {
    expect(sessionLoaded({ email: 'alice@example.org' }, { hadSession: false })).toEqual({
      status: 'signedIn',
      email: 'alice@example.org',
    });
  });

  it('should be a visitor when no account is loaded and no session existed', () => {
    expect(sessionLoaded(null, { hadSession: false })).toEqual({ status: 'visitor' });
  });

  it('should be a visitor told that the session expired when no account is loaded but a session existed', () => {
    expect(sessionLoaded(null, { hadSession: true })).toEqual({ status: 'visitor', notice: 'expired' });
  });

  it('should drop the expiry notice when it is dismissed', () => {
    expect(noticeDismissed({ status: 'visitor', notice: 'expired' })).toEqual({ status: 'visitor' });
  });

  it('should be signed in when signing in, and a visitor when signing out', () => {
    expect(signedIn('alice@example.org')).toEqual({ status: 'signedIn', email: 'alice@example.org' });
    expect(signedOut()).toEqual({ status: 'visitor' });
  });
});

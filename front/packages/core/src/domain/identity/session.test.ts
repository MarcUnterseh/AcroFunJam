import { describe, expect, it } from 'vitest';
import {
  canPropose,
  canManageTags,
  canManagePhotos,
  canManageVideos,
  canValidateProposals,
  initialSession,
  noticeDismissed,
  sessionLoaded,
  signedIn,
  signedOut,
} from './session';

describe('session', () => {
  it('should start by checking the session when the site opens', () => {
    expect(initialSession).toEqual({ status: 'checking' });
  });

  it('should be signed in with the address and the capabilities when an account is loaded', () => {
    expect(
      sessionLoaded({ email: 'alice@example.org', capabilities: ['propose'] }, { hadSession: false }),
    ).toEqual({
      status: 'signedIn',
      email: 'alice@example.org',
      capabilities: ['propose'],
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
    expect(signedIn('alice@example.org')).toEqual({
      status: 'signedIn',
      email: 'alice@example.org',
      capabilities: [],
    });
    expect(signedOut()).toEqual({ status: 'visitor' });
  });
});

describe('canPropose', () => {
  it('should be true when the signed-in person has the capability "propose"', () => {
    expect(canPropose(signedIn('alice@example.org', ['propose']))).toBe(true);
  });

  it('should be false when the signed-in person lacks the capability "propose"', () => {
    expect(canPropose(signedIn('alice@example.org', []))).toBe(false);
  });

  it.each([initialSession, signedOut(), { status: 'visitor', notice: 'expired' } as const])(
    'should be false when nobody is signed in (%o)',
    (session) => {
      expect(canPropose(session)).toBe(false);
    },
  );
});

describe('canValidateProposals', () => {
  it.each([
    [['propose', 'validate-proposals'], true],
    [['propose'], false],
  ] as const)(
    'should tell whether the signed-in person may validate proposals when the capabilities are %j',
    (capabilities, expected) => {
      expect(canValidateProposals(signedIn('bruno@example.org', capabilities))).toBe(expected);
    },
  );

  it('should be false when nobody is signed in', () => {
    expect(canValidateProposals(signedOut())).toBe(false);
    expect(canValidateProposals(initialSession)).toBe(false);
  });
});

describe('canManageTags', () => {
  it.each([
    [['propose', 'validate-proposals', 'manage-tags'], true],
    [['propose', 'validate-proposals'], false],
  ] as const)(
    'should tell whether the signed-in person may manage the tags when the capabilities are %j',
    (capabilities, expected) => {
      expect(canManageTags(signedIn('bruno@example.org', capabilities))).toBe(expected);
    },
  );

  it('should be false when nobody is signed in', () => {
    expect(canManageTags(signedOut())).toBe(false);
  });
});

describe('canManagePhotos', () => {
  it.each([
    [['propose', 'validate-proposals', 'manage-tags', 'manage-photos'], true],
    [['propose', 'validate-proposals', 'manage-tags'], false],
  ] as const)(
    'should tell whether the signed-in person may manage the photos when the capabilities are %j',
    (capabilities, expected) => {
      expect(canManagePhotos(signedIn('bruno@example.org', capabilities))).toBe(expected);
    },
  );

  it('should be false when nobody is signed in', () => {
    expect(canManagePhotos(signedOut())).toBe(false);
  });
});

describe('canManageVideos', () => {
  it.each([
    [['propose', 'validate-proposals', 'manage-tags', 'manage-photos', 'manage-videos'], true],
    [['propose', 'validate-proposals', 'manage-tags', 'manage-photos'], false],
  ] as const)(
    'should tell whether the signed-in person may manage the videos when the capabilities are %j',
    (capabilities, expected) => {
      expect(canManageVideos(signedIn('bruno@example.org', capabilities))).toBe(expected);
    },
  );

  it('should be false when nobody is signed in', () => {
    expect(canManageVideos(signedOut())).toBe(false);
  });
});

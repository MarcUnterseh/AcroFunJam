import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { AuthFailure } from '../../domain/identity/identity-labels';
import type { AuthGateway, CurrentAccount } from './AuthGateway';
import { dismissExpiredNotice, loadSession, register, signIn, signOut } from './identity-use-cases';
import type { SessionMemory } from './SessionMemoryPort';

const alice = { email: 'alice@example.org', password: 'une phrase de passe' };

class FakeAuthGateway implements AuthGateway {
  calls: string[] = [];
  signInAnswer: Result<void, AuthFailure> = ok(undefined);
  registerAnswer: Result<void, AuthFailure> = ok(undefined);
  signOutAnswer: Result<void, AuthFailure> = ok(undefined);
  account: Result<CurrentAccount | null, AuthFailure> = ok(null);

  async signIn() {
    this.calls.push('signIn');
    return this.signInAnswer;
  }
  async register() {
    this.calls.push('register');
    return this.registerAnswer;
  }
  async signOut() {
    this.calls.push('signOut');
    return this.signOutAnswer;
  }
  async currentAccount() {
    this.calls.push('currentAccount');
    return this.account;
  }
}

class FakeSessionMemory implements SessionMemory {
  constructor(public hadSession = false) {}
  wasSignedIn = () => this.hadSession;
  remember = () => {
    this.hadSession = true;
  };
  forget = () => {
    this.hadSession = false;
  };
  onChange = () => () => {};
}

describe('signIn', () => {
  it('should remember the session and read the account, capabilities included, when the credentials are accepted', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = ok({ email: 'alice@example.org', capabilities: ['propose', 'validate-proposals'] });
    const memory = new FakeSessionMemory();

    const result = await signIn(gateway, memory, alice);

    expect(result).toEqual(
      ok({ status: 'signedIn', email: 'alice@example.org', capabilities: ['propose', 'validate-proposals'] }),
    );
    expect(gateway.calls).toEqual(['signIn', 'currentAccount']);
    expect(memory.hadSession).toBe(true);
  });

  it.each([
    ['cannot be reached', fail('unreachable' as const)],
    ['does not see the session yet', ok(null)],
  ])(
    'should be signed in without any capability, the safe side, when the account %s right after signing in',
    async (_case, account) => {
      const gateway = new FakeAuthGateway();
      gateway.account = account;

      const result = await signIn(gateway, new FakeSessionMemory(), alice);

      // Nothing is offered that the API might refuse; the session is read again at the next navigation.
      expect(result).toEqual(ok({ status: 'signedIn', email: 'alice@example.org', capabilities: [] }));
    },
  );

  it('should not call the API when the input is invalid', async () => {
    const gateway = new FakeAuthGateway();

    const result = await signIn(gateway, new FakeSessionMemory(), { email: '', password: '' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe('invalid-input');
    expect(gateway.calls).toEqual([]);
  });

  it('should report the refusal without remembering a session when the credentials are wrong', async () => {
    const gateway = new FakeAuthGateway();
    gateway.signInAnswer = fail('invalid-credentials');
    const memory = new FakeSessionMemory();

    const result = await signIn(gateway, memory, alice);

    expect(result).toEqual(fail({ kind: 'refused', reason: 'invalid-credentials' }));
    expect(memory.hadSession).toBe(false);
  });
});

describe('register', () => {
  it('should register, sign in, then read the account when the account is created', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = ok({ email: 'alice@example.org', capabilities: ['propose'] });
    const memory = new FakeSessionMemory();

    const result = await register(gateway, memory, alice);

    expect(result).toEqual(ok({ status: 'signedIn', email: 'alice@example.org', capabilities: ['propose'] }));
    expect(gateway.calls).toEqual(['register', 'signIn', 'currentAccount']);
    expect(memory.hadSession).toBe(true);
  });

  it('should not call the API when the password is too short', async () => {
    const gateway = new FakeAuthGateway();

    const result = await register(gateway, new FakeSessionMemory(), {
      email: alice.email,
      password: 'Throne-26',
    });

    expect(!result.ok && result.error).toEqual({
      kind: 'invalid-input',
      errors: [{ field: 'password', code: 'identity.password-too-short' }],
    });
    expect(gateway.calls).toEqual([]);
  });

  it('should report the refusal when the address is already used', async () => {
    const gateway = new FakeAuthGateway();
    gateway.registerAnswer = fail('email-already-used');

    expect(await register(gateway, new FakeSessionMemory(), alice)).toEqual(
      fail({ kind: 'refused', reason: 'email-already-used' }),
    );
    expect(gateway.calls).toEqual(['register']);
  });

  it('should say the account exists but is not signed in when signing in after registering fails', async () => {
    const gateway = new FakeAuthGateway();
    gateway.signInAnswer = fail('unreachable');

    expect(await register(gateway, new FakeSessionMemory(), alice)).toEqual(
      fail({ kind: 'registered-but-not-signed-in' }),
    );
  });
});

describe('signOut', () => {
  it('should forget the session when signed out', async () => {
    const memory = new FakeSessionMemory(true);

    expect(await signOut(new FakeAuthGateway(), memory)).toEqual(ok({ status: 'visitor' }));
    expect(memory.hadSession).toBe(false);
  });

  it('should keep the session when the API is unreachable', async () => {
    const gateway = new FakeAuthGateway();
    gateway.signOutAnswer = fail('unreachable');
    const memory = new FakeSessionMemory(true);

    expect(await signOut(gateway, memory)).toEqual(fail({ kind: 'refused', reason: 'unreachable' }));
    expect(memory.hadSession).toBe(true);
  });
});

describe('loadSession', () => {
  it('should be signed in with the capabilities, and remember the session, when the API knows the account', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = ok({ email: 'vera@example.org', capabilities: ['propose', 'validate-proposals'] });
    const memory = new FakeSessionMemory();

    expect(await loadSession(gateway, memory)).toEqual({
      status: 'signedIn',
      email: 'vera@example.org',
      capabilities: ['propose', 'validate-proposals'],
    });
    expect(memory.hadSession).toBe(true);
  });

  it('should be a visitor when there is no session and none existed', async () => {
    expect(await loadSession(new FakeAuthGateway(), new FakeSessionMemory())).toEqual({ status: 'visitor' });
  });

  it('should tell the session expired, every time it is read, until the notice is dismissed', async () => {
    const memory = new FakeSessionMemory(true);
    const gateway = new FakeAuthGateway();

    // Reading twice (concurrent reads, reloads) must not lose the information.
    expect(await loadSession(gateway, memory)).toEqual({ status: 'visitor', notice: 'expired' });
    expect(await loadSession(gateway, memory)).toEqual({ status: 'visitor', notice: 'expired' });

    dismissExpiredNotice(memory);
    expect(await loadSession(gateway, memory)).toEqual({ status: 'visitor' });
  });

  it('should offer the visitor header without forgetting the hint when the API is unreachable', async () => {
    const gateway = new FakeAuthGateway();
    gateway.account = fail('unreachable');
    const memory = new FakeSessionMemory(true);

    // The person can still try to sign in, and is then told that AcroFunJam cannot be reached.
    expect(await loadSession(gateway, memory)).toEqual({ status: 'visitor' });
    expect(memory.hadSession).toBe(true);
  });
});

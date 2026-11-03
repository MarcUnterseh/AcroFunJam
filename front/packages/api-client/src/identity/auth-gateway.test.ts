import { fail, ok, type Credentials } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createAuthGateway } from './auth-gateway';

const alice = { email: 'alice@example.org', password: 'une phrase de passe' } as Credentials;

type Answer = { status: number; body?: unknown } | 'network-error';

const gatewayAnswering = (answer: Answer) => {
  const requests: Request[] = [];
  const client = createApiClient({
    baseUrl: 'http://site.test',
    fetch: async (request) => {
      requests.push(request);
      if (answer === 'network-error') throw new TypeError('Failed to fetch');
      return new Response(answer.body === undefined ? null : JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
  return { gateway: createAuthGateway(client), requests };
};

const validationProblem = (key: string) => ({
  status: 400,
  body: { title: 'One or more validation errors occurred.', errors: { [key]: ['…'] } },
});

describe('createAuthGateway.signIn', () => {
  it('should sign in with a session cookie when the credentials are accepted', async () => {
    const { gateway, requests } = gatewayAnswering({ status: 200, body: {} });

    expect(await gateway.signIn(alice)).toEqual(ok(undefined));
    expect(requests[0]?.url).toBe('http://site.test/identity/login?useCookies=true');
  });

  it('should refuse generically when the credentials are wrong', async () => {
    const { gateway } = gatewayAnswering({ status: 401, body: { detail: 'Failed' } });

    expect(await gateway.signIn(alice)).toEqual(fail('invalid-credentials'));
  });

  it('should report the lock-out when there were too many attempts', async () => {
    const { gateway } = gatewayAnswering({ status: 401, body: { detail: 'LockedOut' } });

    expect(await gateway.signIn(alice)).toEqual(fail('locked-out'));
  });

  it.each<Answer>(['network-error', { status: 503 }])(
    'should report the API as unreachable when %o',
    async (answer) => {
      const { gateway } = gatewayAnswering(answer);

      expect(await gateway.signIn(alice)).toEqual(fail('unreachable'));
    },
  );
});

describe('createAuthGateway.register', () => {
  it('should succeed when the account is created', async () => {
    expect(await gatewayAnswering({ status: 200 }).gateway.register(alice)).toEqual(ok(undefined));
  });

  it.each([
    ['DuplicateEmail', 'email-already-used'],
    ['DuplicateUserName', 'email-already-used'],
    ['PasswordTooShort', 'password-too-short'],
    ['InvalidEmail', 'invalid-email'],
  ] as const)('should translate the %s validation error into %s', async (key, failure) => {
    expect(await gatewayAnswering(validationProblem(key)).gateway.register(alice)).toEqual(fail(failure));
  });

  it('should report the API as unreachable when the network fails', async () => {
    expect(await gatewayAnswering('network-error').gateway.register(alice)).toEqual(fail('unreachable'));
  });
});

describe('createAuthGateway.signOut', () => {
  it.each([204, 401])('should succeed when the API answers %i', async (status) => {
    const { gateway, requests } = gatewayAnswering({ status });

    expect(await gateway.signOut()).toEqual(ok(undefined));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://site.test/identity/logout');
  });

  it('should report the API as unreachable when the network fails', async () => {
    expect(await gatewayAnswering('network-error').gateway.signOut()).toEqual(fail('unreachable'));
  });
});

describe('createAuthGateway.currentAccount', () => {
  it('should return the account when there is a session', async () => {
    const { gateway } = gatewayAnswering({
      status: 200,
      body: { email: 'alice@example.org', role: 'user', capabilities: ['propose'] },
    });

    expect(await gateway.currentAccount()).toEqual(
      ok({ email: 'alice@example.org', capabilities: ['propose'] }),
    );
  });

  it.each([['propose'], [null], [undefined]])(
    'should read no capability when the API does not send a list (%s)',
    async (capabilities) => {
      const { gateway } = gatewayAnswering({
        status: 200,
        body: { email: 'alice@example.org', role: 'user', capabilities },
      });

      expect(await gateway.currentAccount()).toEqual(ok({ email: 'alice@example.org', capabilities: [] }));
    },
  );

  it('should keep the known capabilities and ignore the unknown codes', async () => {
    const { gateway } = gatewayAnswering({
      status: 200,
      body: {
        email: 'vera@example.org',
        role: 'validator',
        capabilities: ['propose', 'validate-proposals', 'fly-solo'],
      },
    });

    expect(await gateway.currentAccount()).toEqual(
      ok({ email: 'vera@example.org', capabilities: ['propose', 'validate-proposals'] }),
    );
  });

  it('should return no account when there is no session', async () => {
    expect(await gatewayAnswering({ status: 401 }).gateway.currentAccount()).toEqual(ok(null));
  });

  it('should report the API as unreachable when the network fails', async () => {
    expect(await gatewayAnswering('network-error').gateway.currentAccount()).toEqual(fail('unreachable'));
  });
});

describe('createAuthGateway robustness', () => {
  it.each([403, 404, 400])(
    'should report the API as unreachable when /me answers an unexpected %i',
    async (status) => {
      expect(await gatewayAnswering({ status }).gateway.currentAccount()).toEqual(fail('unreachable'));
    },
  );

  it('should refuse the registration generically when the API reports an unknown rule', async () => {
    expect(
      await gatewayAnswering(validationProblem('PasswordRequiresDigit')).gateway.register(alice),
    ).toEqual(fail('registration-refused'));
  });

  it('should report the API as unreachable when it answers a server error', async () => {
    const { gateway } = gatewayAnswering({ status: 503 });

    expect(await gateway.register(alice)).toEqual(fail('unreachable'));
    expect(await gateway.signOut()).toEqual(fail('unreachable'));
    expect(await gateway.currentAccount()).toEqual(fail('unreachable'));
  });
});

import { fail, ok, type AuthFailure, type AuthGateway, type Result } from '@acrofunjam/core';
import type { ApiClient } from '../client';

type ProblemBody = { readonly detail?: string | null; readonly errors?: Record<string, unknown> | null };

/**
 * Validation keys of ASP.NET Core Identity (IdentityError codes) and their meaning for the site.
 * Pinned by the contract tests of AcroFunJam.Api.Tests and the @api specs (ADR 0006).
 */
const registrationFailures: ReadonlyArray<readonly [string, AuthFailure]> = [
  ['DuplicateEmail', 'email-already-used'],
  ['DuplicateUserName', 'email-already-used'],
  ['PasswordTooShort', 'password-too-short'],
  ['InvalidEmail', 'invalid-email'],
];

/** Runs a request; a network failure or a server error means the API cannot be reached. */
const call = async (
  request: () => Promise<{ response: Response; data?: unknown; error?: unknown }>,
): Promise<Result<{ response: Response; data: unknown; problem: ProblemBody | undefined }, AuthFailure>> => {
  try {
    const { response, data, error } = await request();
    if (response.status >= 500) return fail('unreachable');
    return ok({ response, data, problem: error as ProblemBody | undefined });
  } catch {
    return fail('unreachable');
  }
};

/** HTTP adapter of the AuthGateway port: the web session is a cookie the site never sees (ADR 0011). */
export const createAuthGateway = (client: ApiClient): AuthGateway => ({
  async signIn({ email, password }) {
    const answer = await call(() =>
      client.POST('/identity/login', { params: { query: { useCookies: true } }, body: { email, password } }),
    );
    if (!answer.ok) return answer;
    if (answer.value.response.ok) return ok(undefined);
    return fail(answer.value.problem?.detail === 'LockedOut' ? 'locked-out' : 'invalid-credentials');
  },

  async register({ email, password }) {
    const answer = await call(() => client.POST('/identity/register', { body: { email, password } }));
    if (!answer.ok) return answer;
    if (answer.value.response.ok) return ok(undefined);
    const keys = Object.keys(answer.value.problem?.errors ?? {});
    const failure = registrationFailures.find(([key]) => keys.includes(key));
    return fail(failure ? failure[1] : 'registration-refused');
  },

  async signOut() {
    const answer = await call(() => client.POST('/identity/logout'));
    // 401: there was no session anymore, which is what signing out wants.
    return answer.ok ? ok(undefined) : answer;
  },

  async currentAccount() {
    const answer = await call(() => client.GET('/me'));
    if (!answer.ok) return answer;
    if (answer.value.response.status === 401) return ok(null);
    // Any other unexpected answer (403, 404 from a misconfigured proxy…): the session cannot be read.
    if (!answer.value.response.ok) return fail('unreachable');
    const account = answer.value.data as { email: string };
    return ok({ email: account.email });
  },
});

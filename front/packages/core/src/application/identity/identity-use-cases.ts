import { fail, ok, type Result } from '../../domain/common/result';
import { validateRegistration, validateSignIn, type FieldError } from '../../domain/identity/credentials';
import type { AuthFailure } from '../../domain/identity/identity-labels';
import { sessionLoaded, signedIn, signedOut, type Session } from '../../domain/identity/session';
import type { AuthGateway } from './AuthGateway';
import type { SessionMemory } from './SessionMemoryPort';

export type IdentityError =
  | { readonly kind: 'invalid-input'; readonly errors: readonly FieldError[] }
  | { readonly kind: 'refused'; readonly reason: AuthFailure }
  | { readonly kind: 'registered-but-not-signed-in' };

type Input = { readonly email: string; readonly password: string };

/** Checks the form locally (no request if invalid), then signs in and remembers that a session exists. */
export const signIn = async (
  gateway: AuthGateway,
  memory: SessionMemory,
  input: Input,
): Promise<Result<Session, IdentityError>> => {
  const credentials = validateSignIn(input);
  if (!credentials.ok) return fail({ kind: 'invalid-input', errors: credentials.error });

  const answer = await gateway.signIn(credentials.value);
  if (!answer.ok) return fail({ kind: 'refused', reason: answer.error });

  memory.remember();
  return ok(await signedInWithCapabilities(gateway, credentials.value.email));
};

/**
 * Reads the account just signed in, for its capabilities (ADR 0019). If it cannot be read, the person is
 * signed in without any capability: the safe side, and the session is read again at the next navigation.
 */
const signedInWithCapabilities = async (gateway: AuthGateway, email: string): Promise<Session> => {
  const account = await gateway.currentAccount();
  return signedIn(email, account.ok && account.value ? account.value.capabilities : []);
};

/** Registering signs in at once (story 2b): register, then sign in. */
export const register = async (
  gateway: AuthGateway,
  memory: SessionMemory,
  input: Input,
): Promise<Result<Session, IdentityError>> => {
  const credentials = validateRegistration(input);
  if (!credentials.ok) return fail({ kind: 'invalid-input', errors: credentials.error });

  const registered = await gateway.register(credentials.value);
  if (!registered.ok) return fail({ kind: 'refused', reason: registered.error });

  const signedInAnswer = await gateway.signIn(credentials.value);
  if (!signedInAnswer.ok) return fail({ kind: 'registered-but-not-signed-in' });

  memory.remember();
  return ok(await signedInWithCapabilities(gateway, credentials.value.email));
};

/**
 * What the person kept in the tab and must not leave behind on a shared device (such as the input kept by the
 * form « Proposer une pose »). Declared here so that Identity does not depend on the contexts that keep data.
 */
export type ForgottenOnSignOut = { clear(): void };

/**
 * Signs out everywhere (the hint is forgotten, other tabs follow) and forgets what was kept in the tab;
 * stays signed in, keeping everything, if the API cannot be reached.
 */
export const signOut = async (
  gateway: AuthGateway,
  memory: SessionMemory,
  forgotten: readonly ForgottenOnSignOut[] = [],
): Promise<Result<Session, IdentityError>> => {
  const answer = await gateway.signOut();
  if (!answer.ok) return fail({ kind: 'refused', reason: answer.error });

  memory.forget();
  for (const kept of forgotten) kept.clear();
  return ok(signedOut());
};

/**
 * The session was read again: if a signed-in person became a visitor without the "expired" notice, the person
 * signed out elsewhere (another tab). What was kept in the tab is forgotten, as on a sign-out here. An expired
 * session keeps it: it is given back after signing in again.
 */
export const forgetWhenSignedOutElsewhere = (
  previous: Session,
  next: Session,
  forgotten: readonly ForgottenOnSignOut[],
): void => {
  if (previous.status === 'signedIn' && next.status === 'visitor' && next.notice !== 'expired')
    for (const kept of forgotten) kept.clear();
};

/**
 * Reads the session at start-up or after a change: signed in, visitor, or visitor whose session expired.
 * `known` is the session read before, if any.
 */
export const loadSession = async (
  gateway: AuthGateway,
  memory: SessionMemory,
  known?: Session,
): Promise<Session> => {
  const account = await gateway.currentAccount();
  // Unreachable: an outage changes nothing to the session known so far (signed in, or expired). Otherwise,
  // offer the visitor header (the person may try to sign in), and keep the hint for later.
  if (!account.ok) return known ?? { status: 'visitor' };

  const session = sessionLoaded(account.value, { hadSession: memory.wasSignedIn() });
  // An expired session keeps its hint until the notice is dismissed (or the person signs in again):
  // reading the session twice — concurrent reads, a reload — must not lose the information.
  if (session.status === 'signedIn') memory.remember();
  return session;
};

/** The person has read the "session expired" notice: forget that a session existed in this browser. */
export const dismissExpiredNotice = (memory: SessionMemory): void => memory.forget();

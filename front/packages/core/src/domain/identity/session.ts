import type { Capability } from './capability';

/**
 * What the site knows about the person's session (ADR 0013). An expired session is a visitor
 * with a notice: the header is the visitor's one, and a banner explains what happened.
 * A signed-in person comes with the capabilities of the role (ADR 0019), never the role itself.
 */
export type Session =
  | { readonly status: 'checking' }
  | { readonly status: 'visitor'; readonly notice?: 'expired' }
  | { readonly status: 'signedIn'; readonly email: string; readonly capabilities: readonly Capability[] };

export const initialSession: Session = { status: 'checking' };

type LoadedAccount = { readonly email: string; readonly capabilities: readonly Capability[] };

/** The account read from the API (null: no session), and whether a session existed in this browser. */
export const sessionLoaded = (
  account: LoadedAccount | null,
  memory: { readonly hadSession: boolean },
): Session => {
  if (account) return { status: 'signedIn', email: account.email, capabilities: account.capabilities };
  return memory.hadSession ? { status: 'visitor', notice: 'expired' } : { status: 'visitor' };
};

/** Just signed in. Without capabilities, nothing is offered that the API might refuse (the safe side). */
export const signedIn = (email: string, capabilities: readonly Capability[] = []): Session => ({
  status: 'signedIn',
  email,
  capabilities,
});

export const signedOut = (): Session => ({ status: 'visitor' });

export const noticeDismissed = (session: Session): Session =>
  session.status === 'visitor' ? { status: 'visitor' } : session;

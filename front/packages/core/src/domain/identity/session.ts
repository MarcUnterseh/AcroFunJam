/**
 * What the site knows about the person's session (ADR 0013). An expired session is a visitor
 * with a notice: the header is the visitor's one, and a banner explains what happened.
 */
export type Session =
  | { readonly status: 'checking' }
  | { readonly status: 'visitor'; readonly notice?: 'expired' }
  | { readonly status: 'signedIn'; readonly email: string };

export const initialSession: Session = { status: 'checking' };

/** The account read from the API (null: no session), and whether a session existed in this browser. */
export const sessionLoaded = (
  account: { readonly email: string } | null,
  memory: { readonly hadSession: boolean },
): Session => {
  if (account) return { status: 'signedIn', email: account.email };
  return memory.hadSession ? { status: 'visitor', notice: 'expired' } : { status: 'visitor' };
};

export const signedIn = (email: string): Session => ({ status: 'signedIn', email });

export const signedOut = (): Session => ({ status: 'visitor' });

export const noticeDismissed = (session: Session): Session =>
  session.status === 'visitor' ? { status: 'visitor' } : session;

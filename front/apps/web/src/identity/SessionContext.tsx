import {
  dismissExpiredNotice,
  forgetWhenSignedOutElsewhere,
  initialSession,
  loadSession,
  register as registerUseCase,
  signIn as signInUseCase,
  signOut as signOutUseCase,
  type IdentityError,
  type Result,
  type Session,
} from '@acrofunjam/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useIdentity } from './IdentityContext';

type Input = { readonly email: string; readonly password: string };

type SessionApi = {
  readonly session: Session;
  /** The session expired (ADR 0013): shown until the person closes the banner or signs in again. */
  readonly expired: boolean;
  readonly dismissExpired: () => void;
  /** A request of the page was refused for want of a session (401): the session expired meanwhile. */
  readonly sessionExpired: () => void;
  readonly signIn: (input: Input) => Promise<Result<Session, IdentityError>>;
  readonly register: (input: Input) => Promise<Result<Session, IdentityError>>;
  readonly signOut: () => Promise<Result<Session, IdentityError>>;
};

const SessionContext = createContext<SessionApi | null>(null);
const sessionKey = ['session'] as const;

/** Reads the session at start-up, after each navigation and when another tab changes it; exposes the use cases. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { gateway, memory, forgetOnSignOut } = useIdentity();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [expired, setExpired] = useState(false);

  const query = useQuery({
    queryKey: sessionKey,
    // The session known so far is kept if it cannot be read again (an outage is no sign-out).
    queryFn: () => loadSession(gateway, memory, queryClient.getQueryData<Session>(sessionKey)),
  });
  const session = query.data ?? initialSession;

  useEffect(() => {
    if (session.status === 'visitor' && session.notice === 'expired') setExpired(true);
    if (session.status === 'signedIn') setExpired(false);
  }, [session]);

  // Signed out in another tab: what was kept in this tab is forgotten too (shared device).
  const previous = useRef(session);
  useEffect(() => {
    forgetWhenSignedOutElsewhere(previous.current, session, forgetOnSignOut ?? []);
    previous.current = session;
  }, [session, forgetOnSignOut]);

  // Re-read the session after each navigation, but not on the first display: the initial query does it,
  // and a second concurrent read would cancel it after it had already forgotten the "expired" hint.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    void queryClient.invalidateQueries({ queryKey: sessionKey });
  }, [location.pathname, queryClient]);

  useEffect(
    () => memory.onChange(() => void queryClient.invalidateQueries({ queryKey: sessionKey })),
    [memory, queryClient],
  );

  const settle = useCallback(
    (result: Result<Session, IdentityError>) => {
      if (result.ok) {
        queryClient.setQueryData(sessionKey, result.value);
        if (result.value.status === 'signedIn') setExpired(false);
      }
      return result;
    },
    [queryClient],
  );

  const api: SessionApi = {
    session,
    expired: expired && session.status === 'visitor',
    dismissExpired: () => {
      dismissExpiredNotice(memory);
      setExpired(false);
    },
    sessionExpired: () => {
      const expiredSession: Session = { status: 'visitor', notice: 'expired' };
      queryClient.setQueryData(sessionKey, expiredSession);
      setExpired(true);
    },
    signIn: async (input) => settle(await signInUseCase(gateway, memory, input)),
    register: async (input) => settle(await registerUseCase(gateway, memory, input)),
    signOut: async () => settle(await signOutUseCase(gateway, memory, forgetOnSignOut)),
  };

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const api = useContext(SessionContext);
  if (!api) throw new Error('useSession must be used inside a SessionProvider');
  return api;
}

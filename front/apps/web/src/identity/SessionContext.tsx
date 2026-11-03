import {
  dismissExpiredNotice,
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
  readonly signIn: (input: Input) => Promise<Result<Session, IdentityError>>;
  readonly register: (input: Input) => Promise<Result<Session, IdentityError>>;
  readonly signOut: () => Promise<Result<Session, IdentityError>>;
};

const SessionContext = createContext<SessionApi | null>(null);
const sessionKey = ['session'] as const;

/** Reads the session at start-up, after each navigation and when another tab changes it; exposes the use cases. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { gateway, memory } = useIdentity();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [expired, setExpired] = useState(false);

  const query = useQuery({ queryKey: sessionKey, queryFn: () => loadSession(gateway, memory) });
  const session = query.data ?? initialSession;

  useEffect(() => {
    if (session.status === 'visitor' && session.notice === 'expired') setExpired(true);
    if (session.status === 'signedIn') setExpired(false);
  }, [session]);

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
    signIn: async (input) => settle(await signInUseCase(gateway, memory, input)),
    register: async (input) => settle(await registerUseCase(gateway, memory, input)),
    signOut: async () => settle(await signOutUseCase(gateway, memory)),
  };

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const api = useContext(SessionContext);
  if (!api) throw new Error('useSession must be used inside a SessionProvider');
  return api;
}

import type { AuthGateway, ForgottenOnSignOut, SessionMemory } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type Identity = {
  readonly gateway: AuthGateway;
  readonly memory: SessionMemory;
  /** What other contexts keep in the tab and must be forgotten on sign-out (such as the kept proposal input). */
  readonly forgetOnSignOut?: readonly ForgottenOnSignOut[] | undefined;
};

const IdentityContext = createContext<Identity | null>(null);

/** Injects the identity adapters chosen by the composition root (main.tsx, or fakes in tests). */
export function IdentityProvider({
  gateway,
  memory,
  forgetOnSignOut,
  children,
}: Identity & { children: ReactNode }) {
  return (
    <IdentityContext.Provider value={{ gateway, memory, forgetOnSignOut }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity(): Identity {
  const identity = useContext(IdentityContext);
  if (!identity) throw new Error('useIdentity must be used inside an IdentityProvider');
  return identity;
}

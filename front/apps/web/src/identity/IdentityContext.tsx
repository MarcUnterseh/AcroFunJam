import type { AuthGateway, SessionMemory } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type Identity = { readonly gateway: AuthGateway; readonly memory: SessionMemory };

const IdentityContext = createContext<Identity | null>(null);

/** Injects the identity adapters chosen by the composition root (main.tsx, or fakes in tests). */
export function IdentityProvider({ gateway, memory, children }: Identity & { children: ReactNode }) {
  return <IdentityContext.Provider value={{ gateway, memory }}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): Identity {
  const identity = useContext(IdentityContext);
  if (!identity) throw new Error('useIdentity must be used inside an IdentityProvider');
  return identity;
}

import type { PoseRevisionGateway, RevisionInputStore } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type PoseRevision = { readonly gateway: PoseRevisionGateway; readonly store: RevisionInputStore };

const PoseRevisionContext = createContext<PoseRevision | null>(null);

/** Injects the adapters of the revision of a pose (story 6) chosen by the composition root (main.tsx, or fakes). */
export function PoseRevisionProvider({ gateway, store, children }: PoseRevision & { children: ReactNode }) {
  return <PoseRevisionContext.Provider value={{ gateway, store }}>{children}</PoseRevisionContext.Provider>;
}

export function usePoseRevision(): PoseRevision {
  const revision = useContext(PoseRevisionContext);
  if (!revision) throw new Error('usePoseRevision must be used inside a PoseRevisionProvider');
  return revision;
}

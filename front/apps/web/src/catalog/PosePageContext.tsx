import type { PosePageGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const PosePageContext = createContext<PosePageGateway | null>(null);

/** Injects the adapter of the page of a pose (story 7) chosen by the composition root (main.tsx, or a fake). */
export function PosePageProvider({ gateway, children }: { gateway: PosePageGateway; children: ReactNode }) {
  return <PosePageContext.Provider value={gateway}>{children}</PosePageContext.Provider>;
}

export function usePosePageGateway(): PosePageGateway {
  const gateway = useContext(PosePageContext);
  if (!gateway) throw new Error('usePosePageGateway must be used inside a PosePageProvider');
  return gateway;
}

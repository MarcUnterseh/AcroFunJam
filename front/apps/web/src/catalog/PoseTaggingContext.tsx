import type { PoseTaggingGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const PoseTaggingContext = createContext<PoseTaggingGateway | null>(null);

/** Injects the adapter tagging a published pose (story 9a) chosen by the composition root (main.tsx, or a fake). */
export function PoseTaggingProvider({
  gateway,
  children,
}: {
  gateway: PoseTaggingGateway;
  children: ReactNode;
}) {
  return <PoseTaggingContext.Provider value={gateway}>{children}</PoseTaggingContext.Provider>;
}

export function usePoseTaggingGateway(): PoseTaggingGateway {
  const gateway = useContext(PoseTaggingContext);
  if (!gateway) throw new Error('usePoseTaggingGateway must be used inside a PoseTaggingProvider');
  return gateway;
}

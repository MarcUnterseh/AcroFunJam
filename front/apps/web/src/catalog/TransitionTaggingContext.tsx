import type { TransitionTaggingGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const TransitionTaggingContext = createContext<TransitionTaggingGateway | null>(null);

/** Injects the adapter tagging a published transition (story 8) chosen by the composition root (main.tsx, or a fake). */
export function TransitionTaggingProvider({
  gateway,
  children,
}: {
  gateway: TransitionTaggingGateway;
  children: ReactNode;
}) {
  return <TransitionTaggingContext.Provider value={gateway}>{children}</TransitionTaggingContext.Provider>;
}

export function useTransitionTaggingGateway(): TransitionTaggingGateway {
  const gateway = useContext(TransitionTaggingContext);
  if (!gateway)
    throw new Error('useTransitionTaggingGateway must be used inside a TransitionTaggingProvider');
  return gateway;
}

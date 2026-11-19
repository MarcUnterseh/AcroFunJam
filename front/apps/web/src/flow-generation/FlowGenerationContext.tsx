import type { FlowGenerationGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const FlowGenerationContext = createContext<FlowGenerationGateway | null>(null);

/** Injects the adapter of the generation of flows (story 9) chosen by the composition root (main.tsx, or a fake). */
export function FlowGenerationProvider({
  gateway,
  children,
}: {
  gateway: FlowGenerationGateway;
  children: ReactNode;
}) {
  return <FlowGenerationContext.Provider value={gateway}>{children}</FlowGenerationContext.Provider>;
}

export function useFlowGenerationGateway(): FlowGenerationGateway {
  const gateway = useContext(FlowGenerationContext);
  if (!gateway) throw new Error('useFlowGenerationGateway must be used inside a FlowGenerationProvider');
  return gateway;
}

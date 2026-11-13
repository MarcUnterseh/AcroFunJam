import type { TransitionInputStore, TransitionProposalGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type TransitionProposal = {
  readonly gateway: TransitionProposalGateway;
  readonly store: TransitionInputStore;
};

const TransitionProposalContext = createContext<TransitionProposal | null>(null);

/** Injects the adapters of « Proposer une transition » (story 7) chosen by the composition root (main.tsx, or fakes). */
export function TransitionProposalProvider({
  gateway,
  store,
  children,
}: TransitionProposal & { children: ReactNode }) {
  return (
    <TransitionProposalContext.Provider value={{ gateway, store }}>
      {children}
    </TransitionProposalContext.Provider>
  );
}

export function useTransitionProposal(): TransitionProposal {
  const proposal = useContext(TransitionProposalContext);
  if (!proposal) throw new Error('useTransitionProposal must be used inside a TransitionProposalProvider');
  return proposal;
}

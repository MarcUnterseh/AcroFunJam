import type { ContributionGateway, ProposalInputStore } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type Contribution = { readonly gateway: ContributionGateway; readonly store: ProposalInputStore };

const ContributionContext = createContext<Contribution | null>(null);

/** Injects the Contribution adapters chosen by the composition root (main.tsx, or fakes in tests). */
export function ContributionProvider({ gateway, store, children }: Contribution & { children: ReactNode }) {
  return <ContributionContext.Provider value={{ gateway, store }}>{children}</ContributionContext.Provider>;
}

export function useContribution(): Contribution {
  const contribution = useContext(ContributionContext);
  if (!contribution) throw new Error('useContribution must be used inside a ContributionProvider');
  return contribution;
}

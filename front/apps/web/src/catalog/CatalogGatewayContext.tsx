import type { CatalogGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const CatalogGatewayContext = createContext<CatalogGateway | null>(null);

/** Injects the CatalogGateway adapter chosen by the composition root (main.tsx, or a fake in tests). */
export function CatalogGatewayProvider({
  gateway,
  children,
}: {
  gateway: CatalogGateway;
  children: ReactNode;
}) {
  return <CatalogGatewayContext.Provider value={gateway}>{children}</CatalogGatewayContext.Provider>;
}

export function useCatalogGateway(): CatalogGateway {
  const gateway = useContext(CatalogGatewayContext);
  if (!gateway) throw new Error('useCatalogGateway must be used inside a CatalogGatewayProvider');
  return gateway;
}

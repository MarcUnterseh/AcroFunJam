import type { TagListGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

const TagListContext = createContext<TagListGateway | null>(null);

/** Injects the adapter of the list of tags (story 8) chosen by the composition root (main.tsx, or a fake). */
export function TagListProvider({ gateway, children }: { gateway: TagListGateway; children: ReactNode }) {
  return <TagListContext.Provider value={gateway}>{children}</TagListContext.Provider>;
}

export function useTagListGateway(): TagListGateway {
  const gateway = useContext(TagListContext);
  if (!gateway) throw new Error('useTagListGateway must be used inside a TagListProvider');
  return gateway;
}

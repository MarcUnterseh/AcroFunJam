import { listPublishedPoses } from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useCatalogGateway } from './CatalogGatewayContext';

/** Published poses of the catalog, through the listPublishedPoses use case of @acrofunjam/core. */
export function usePublishedPoses() {
  const gateway = useCatalogGateway();
  return useQuery({
    queryKey: ['catalog', 'poses'],
    queryFn: async () => {
      const result = await listPublishedPoses(gateway);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  });
}

import { listPublishedPoses, type DomainError, type PoseSummary } from '@acrofunjam/core';
import { useQuery } from '@tanstack/react-query';
import { useCatalogGateway } from './CatalogGatewayContext';

/** The catalog could not be loaded: carries the failure of the use case, code included. */
export class CatalogLoadingFailed extends Error {
  readonly failure: DomainError;

  constructor(failure: DomainError) {
    super(failure.message);
    this.failure = failure;
    this.name = 'CatalogLoadingFailed';
  }
}

/** Published poses of the catalog, through the listPublishedPoses use case of @acrofunjam/core. */
export function usePublishedPoses() {
  const gateway = useCatalogGateway();
  return useQuery<readonly PoseSummary[], CatalogLoadingFailed>({
    queryKey: ['catalog', 'poses'],
    queryFn: async () => {
      const result = await listPublishedPoses(gateway);
      if (!result.ok) {
        // An unreachable catalog is expected; an answer the site cannot read is a defect to investigate.
        if (result.error.code === 'catalog.unexpected-response')
          console.error(`${result.error.code}: ${result.error.message}`);
        throw new CatalogLoadingFailed(result.error);
      }
      return result.value;
    },
    // The failure is shown at once with a "Réessayer" button: the visitor decides when to try again.
    retry: false,
    // Even when the browser believes it is offline: a failure is better than an endless "Chargement…".
    networkMode: 'always',
  });
}

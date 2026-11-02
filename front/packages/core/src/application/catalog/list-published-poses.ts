import type { PoseSummary } from '../../domain/catalog/pose-summary';
import type { Result } from '../../domain/common/result';
import type { CatalogGateway } from './CatalogGateway';

/** Lists the poses published in the catalog, in catalog order (the order is guaranteed by the API). */
export const listPublishedPoses = (gateway: CatalogGateway): Promise<Result<readonly PoseSummary[]>> =>
  gateway.listPublishedPoses();

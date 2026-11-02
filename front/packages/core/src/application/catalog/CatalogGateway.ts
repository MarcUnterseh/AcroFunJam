import type { PoseSummary } from '../../domain/catalog/pose-summary';
import type { Result } from '../../domain/common/result';

/** Port: access to the published catalog. Implemented by @acrofunjam/api-client. */
export interface CatalogGateway {
  listPublishedPoses(): Promise<Result<readonly PoseSummary[]>>;
}

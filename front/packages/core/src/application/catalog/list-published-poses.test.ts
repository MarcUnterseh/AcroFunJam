import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../../domain/common/result';
import type { PoseSummary } from '../../domain/catalog/pose-summary';
import type { CatalogGateway } from './CatalogGateway';
import { listPublishedPoses } from './list-published-poses';

const throne: PoseSummary = { id: 'p-1', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' };
const bird: PoseSummary = { id: 'p-2', name: 'Bird', baseDifficulty: 'discovery', flyerDifficulty: 'discovery' };

const gatewayAnswering = (answer: Result<readonly PoseSummary[]>): CatalogGateway => ({
  listPublishedPoses: async () => answer,
});

describe('listPublishedPoses', () => {
  it('should return the poses provided by the gateway when the catalog is reachable', async () => {
    const result = await listPublishedPoses(gatewayAnswering(ok([throne, bird])));

    expect(result).toEqual(ok([throne, bird]));
  });

  it('should propagate the failure when the gateway fails', async () => {
    const unreachable = { code: 'catalog.unreachable', message: 'Le catalogue est indisponible.' };

    const result = await listPublishedPoses(gatewayAnswering(fail(unreachable)));

    expect(result).toEqual(fail(unreachable));
  });
});

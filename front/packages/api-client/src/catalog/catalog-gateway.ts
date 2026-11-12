import { fail, ok, type CatalogGateway, type PoseSummary } from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';

type PoseSummaryResponse = components['schemas']['PoseSummaryResponse'];

const unreachable = { code: 'catalog.unreachable', message: 'Le catalogue est momentanément indisponible.' };
const unexpectedResponse = {
  code: 'catalog.unexpected-response',
  message: 'Le catalogue a renvoyé une réponse inattendue.',
};

// The generated types describe the contract, but the server may evolve before the client is regenerated.
const isKnown = (pose: PoseSummaryResponse): boolean =>
  isDifficultyCode(pose.baseDifficulty) &&
  isDifficultyCode(pose.flyerDifficulty) &&
  typeof pose.canStartFlow === 'boolean' &&
  typeof pose.canEndFlow === 'boolean';

// HTTP DTOs never leak into core: they are mapped to the client domain here.
const toPoseSummary = (pose: PoseSummaryResponse): PoseSummary => ({
  id: pose.id,
  name: pose.name,
  baseDifficulty: pose.baseDifficulty,
  flyerDifficulty: pose.flyerDifficulty,
  canStartFlow: pose.canStartFlow,
  canEndFlow: pose.canEndFlow,
});

/** HTTP adapter of the CatalogGateway port of @acrofunjam/core. */
export const createCatalogGateway = (client: ApiClient): CatalogGateway => ({
  async listPublishedPoses() {
    const { data, error } = await client.GET('/catalog/poses');
    if (error !== undefined || data === undefined) return fail(unreachable);
    if (!data.poses.every(isKnown)) return fail(unexpectedResponse);
    return ok(data.poses.map(toPoseSummary));
  },
});

import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createCatalogGateway } from './catalog-gateway';

const apiAnswering = (status: number, body?: unknown) =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  });

describe('createCatalogGateway', () => {
  it('should map the API response to pose summaries when the catalog answers', async () => {
    const gateway = createCatalogGateway(
      apiAnswering(200, {
        poses: [{ id: 'p-1', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' }],
      }),
    );

    const result = await gateway.listPublishedPoses();

    expect(result).toEqual(
      ok([{ id: 'p-1', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' }]),
    );
  });

  it('should fail when the request fails', async () => {
    const gateway = createCatalogGateway(apiAnswering(500, { title: 'Internal Server Error' }));

    const result = await gateway.listPublishedPoses();

    expect(result).toEqual(
      fail({ code: 'catalog.unreachable', message: 'Le catalogue est momentanément indisponible.' }),
    );
  });

  it('should fail when the API sends an unknown difficulty code', async () => {
    const gateway = createCatalogGateway(
      apiAnswering(200, {
        poses: [{ id: 'p-1', name: 'Throne', baseDifficulty: 'expert', flyerDifficulty: 'discovery' }],
      }),
    );

    const result = await gateway.listPublishedPoses();

    expect(result).toEqual(
      fail({ code: 'catalog.unexpected-response', message: 'Le catalogue a renvoyé une réponse inattendue.' }),
    );
  });
});

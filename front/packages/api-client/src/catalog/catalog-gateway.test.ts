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

const throne = {
  id: 'p-1',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
};

const unexpectedResponse = fail({
  code: 'catalog.unexpected-response',
  message: 'Le catalogue a renvoyé une réponse inattendue.',
});

describe('createCatalogGateway', () => {
  it('should map the API response to pose summaries, flow boundaries included, when the catalog answers', async () => {
    const gateway = createCatalogGateway(apiAnswering(200, { poses: [throne] }));

    const result = await gateway.listPublishedPoses();

    expect(result).toEqual(
      ok([
        {
          id: 'p-1',
          name: 'Throne',
          baseDifficulty: 'beginner',
          flyerDifficulty: 'discovery',
          canStartFlow: true,
          canEndFlow: false,
        },
      ]),
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
      apiAnswering(200, { poses: [{ ...throne, baseDifficulty: 'expert' }] }),
    );

    const result = await gateway.listPublishedPoses();

    expect(result).toEqual(unexpectedResponse);
  });

  it.each(['canStartFlow', 'canEndFlow'])(
    'should fail as an unexpected response when the flow boundary %s is missing',
    async (boundary) => {
      const incomplete: Partial<typeof throne> = { ...throne };
      delete incomplete[boundary as keyof typeof throne];
      const gateway = createCatalogGateway(apiAnswering(200, { poses: [incomplete] }));

      const result = await gateway.listPublishedPoses();

      expect(result).toEqual(unexpectedResponse);
    },
  );
});

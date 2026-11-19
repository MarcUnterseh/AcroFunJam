import { defaultFlowCriteria, fail, ok, type GeneratedFlow } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createFlowGenerationGateway } from './flow-generation-gateway';

// Story 9: the HTTP contract of the generation of a flow (POST /flow-generation/flows, ADR 0037).

const apiAnswering = (status: number, body?: unknown, requests: Request[] = []) =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request) => {
      requests.push(request);
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
      });
    },
  });

const problem = (title: string, extensions: Record<string, unknown> = {}) => ({ title, ...extensions });

const generated: GeneratedFlow = {
  start: { id: 'throne', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery', tags: [] },
  steps: [
    {
      number: 1,
      transition: {
        id: 't-1',
        name: 'Pop to Bird',
        baseDifficulty: 'intermediate',
        flyerDifficulty: 'intermediate',
        description: 'Un élan.',
        tags: [
          { id: 'dyn', name: 'dynamique' },
          { id: 'pop', name: 'pop' },
        ],
      },
      isWashingMachine: false,
      arrival: {
        id: 'bird',
        name: 'Bird',
        baseDifficulty: 'beginner',
        flyerDifficulty: 'beginner',
        tags: [],
      },
    },
  ],
};

describe('createFlowGenerationGateway', () => {
  it('should post the criteria and read the flow', async () => {
    const requests: Request[] = [];
    const gateway = createFlowGenerationGateway(apiAnswering(200, generated, requests));

    expect(
      await gateway.generateFlow({
        ...defaultFlowCriteria,
        requestedTagIds: ['lunaire'],
        excludedTagIds: ['vrille'],
      }),
    ).toEqual(ok(generated));
    expect(requests[0]?.method).toBe('POST');
    expect(new URL(requests[0]!.url).pathname).toBe('/flow-generation/flows');
    expect(await requests[0]?.json()).toEqual({
      length: 3,
      baseDifficultyCeiling: 'beginner',
      flyerDifficultyCeiling: 'beginner',
      requestedTagIds: ['lunaire'],
      excludedTagIds: ['vrille'],
    });
  });

  it.each([
    [422, problem('flow-generation.criteria-too-restrictive'), { kind: 'criteria-too-restrictive' }],
    [422, problem('flow-generation.catalog-insufficient'), { kind: 'catalog-insufficient' }],
    [
      409,
      problem('flow-generation.tag-not-in-list', { tagIds: ['vrille'] }),
      { kind: 'tags-not-in-list', tagIds: ['vrille'] },
    ],
    [400, problem('flow-generation.length-out-of-range'), { kind: 'outdated' }],
    [503, undefined, { kind: 'unreachable' }],
  ])('should translate the answer %i %j', async (status, body, failure) => {
    expect(
      await createFlowGenerationGateway(apiAnswering(status, body)).generateFlow(defaultFlowCriteria),
    ).toEqual(fail(failure));
  });

  it('should tell an outdated site when the flow cannot be read', async () => {
    expect(
      await createFlowGenerationGateway(apiAnswering(200, { start: null, steps: [] })).generateFlow(
        defaultFlowCriteria,
      ),
    ).toEqual(fail({ kind: 'outdated' }));
  });

  it('should tell an unreachable API when the request cannot be sent', async () => {
    const offline = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await createFlowGenerationGateway(offline).generateFlow(defaultFlowCriteria)).toEqual(
      fail({ kind: 'unreachable' }),
    );
  });
});

import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createTransitionTaggingGateway } from './transition-tagging-gateway';

// Story 8: PUT /catalog/transitions/{id}/tags, by a validator or an administrator (ADR 0034).

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

const networkDown = () =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

const problem = (status: number, title: string, extensions: object = {}) => ({
  title,
  status,
  ...extensions,
});

describe('createTransitionTaggingGateway', () => {
  it('should send the chosen tags to PUT /catalog/transitions/{id}/tags', async () => {
    const requests: Request[] = [];
    const gateway = createTransitionTaggingGateway(
      apiAnswering(200, { id: 't-1', tags: [{ id: 'tag-pop', name: 'pop' }] }, requests),
    );

    expect(await gateway.tagTransition('t-1', ['tag-pop'])).toEqual(ok(undefined));
    expect(new URL(requests[0]!.url).pathname).toBe('/catalog/transitions/t-1/tags');
    expect(requests[0]!.method).toBe('PUT');
    expect(await requests[0]!.json()).toEqual({ tagIds: ['tag-pop'] });
  });

  it.each([
    [401, 'Unauthorized', { kind: 'unauthenticated' }],
    [403, 'identity.capability-required', { kind: 'forbidden' }],
    [404, 'catalog.transition-not-found', { kind: 'not-found' }],
    [503, 'Service Unavailable', { kind: 'unreachable' }],
    [409, 'something.new', { kind: 'outdated' }],
  ])('should report "%i %s" as %o', async (status, title, failure) => {
    const gateway = createTransitionTaggingGateway(apiAnswering(status, problem(status, title)));

    expect(await gateway.tagTransition('t-1', [])).toEqual(fail(failure));
  });

  it('should report the chosen tags no longer in the list, by identifier', async () => {
    const gateway = createTransitionTaggingGateway(
      apiAnswering(409, problem(409, 'catalog.tag-not-in-list', { tagIds: ['tag-vrille'] })),
    );

    expect(await gateway.tagTransition('t-1', ['tag-vrille'])).toEqual(
      fail({ kind: 'tags-not-in-list', tagIds: ['tag-vrille'] }),
    );
  });

  it('should report a network failure as unreachable', async () => {
    expect(await createTransitionTaggingGateway(networkDown()).tagTransition('t-1', [])).toEqual(
      fail({ kind: 'unreachable' }),
    );
  });
});

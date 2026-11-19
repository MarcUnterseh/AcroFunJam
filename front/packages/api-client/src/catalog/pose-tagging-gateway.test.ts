import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createPoseTaggingGateway } from './pose-tagging-gateway';

// Story 9a: the HTTP contract of the direct tagging of a published pose (ADR 0036).

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

describe('createPoseTaggingGateway', () => {
  it('should put the chosen tags of the pose', async () => {
    const requests: Request[] = [];
    const gateway = createPoseTaggingGateway(apiAnswering(200, { id: 'p-1', tags: [] }, requests));

    expect(await gateway.tagPose('p-1', ['tag-lunaire'])).toEqual(ok(undefined));
    expect(requests[0]?.method).toBe('PUT');
    expect(new URL(requests[0]!.url).pathname).toBe('/catalog/poses/p-1/tags');
    expect(await requests[0]?.json()).toEqual({ tagIds: ['tag-lunaire'] });
  });

  it.each([
    [401, undefined, { kind: 'unauthenticated' }],
    [403, problem('identity.capability-required'), { kind: 'forbidden' }],
    [404, problem('catalog.pose-not-found'), { kind: 'not-found' }],
    [409, problem('catalog.pose-revision-pending'), { kind: 'revision-pending' }],
    [
      409,
      problem('catalog.tag-not-in-list', { tagIds: ['tag-x'] }),
      { kind: 'tags-not-in-list', tagIds: ['tag-x'] },
    ],
    [
      409,
      problem('catalog.tag-not-applicable', { tagIds: ['tag-pop'] }),
      { kind: 'tags-not-applicable', tagIds: ['tag-pop'] },
    ],
    [400, problem('something.new'), { kind: 'outdated' }],
    [503, undefined, { kind: 'unreachable' }],
  ])('should translate the answer %i %j', async (status, body, failure) => {
    const gateway = createPoseTaggingGateway(apiAnswering(status, body));

    expect(await gateway.tagPose('p-1', [])).toEqual(fail(failure));
  });
});

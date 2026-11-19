import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createTagListGateway } from './tag-list-gateway';

// Story 8: the HTTP contract of the list of tags (ADR 0034).

const pop = {
  id: 'tag-pop',
  name: 'pop',
  description: 'La base propulse le flyer.',
  scope: 'transitions',
  impliedTagId: 'tag-dynamique',
  poseCount: 0,
  transitionCount: 2,
};

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

describe('createTagListGateway', () => {
  describe('listTags', () => {
    it('should read the tags of the list when the API answers', async () => {
      const gateway = createTagListGateway(apiAnswering(200, { tags: [pop] }));

      expect(await gateway.listTags()).toEqual(ok([pop]));
    });

    it('should tell the site is outdated when a tag cannot be read', async () => {
      const gateway = createTagListGateway(
        apiAnswering(200, { tags: [{ ...pop, transitionCount: 'deux' }] }),
      );

      expect(await gateway.listTags()).toEqual(fail({ kind: 'outdated' }));
    });

    // Story 9a: what a tag applies to is one of three codes (ADR 0035).
    it('should tell the site is outdated when what a tag applies to is unknown', async () => {
      const gateway = createTagListGateway(apiAnswering(200, { tags: [{ ...pop, scope: 'flows' }] }));

      expect(await gateway.listTags()).toEqual(fail({ kind: 'outdated' }));
    });

    it('should tell the API is unreachable when the server fails', async () => {
      expect(await createTagListGateway(apiAnswering(503)).listTags()).toEqual(fail({ kind: 'unreachable' }));
    });

    it('should tell the API is unreachable when the request cannot be sent', async () => {
      const client = createApiClient({
        baseUrl: 'http://api.test',
        fetch: async () => {
          throw new TypeError('Failed to fetch');
        },
      });

      expect(await createTagListGateway(client).listTags()).toEqual(fail({ kind: 'unreachable' }));
    });
  });

  describe('addTag', () => {
    it('should post the name and the description and read the added tag', async () => {
      const requests: Request[] = [];
      const gateway = createTagListGateway(apiAnswering(201, { ...pop, impliedTagId: null }, requests));

      const result = await gateway.addTag({
        name: 'pop',
        description: 'La base propulse le flyer.',
        scope: 'transitions',
      });

      expect(result).toEqual(ok({ ...pop, impliedTagId: null }));
      expect(requests[0]?.method).toBe('POST');
      expect(new URL(requests[0]!.url).pathname).toBe('/catalog/tags');
      expect(await requests[0]?.json()).toEqual({
        name: 'pop',
        description: 'La base propulse le flyer.',
        scope: 'transitions',
      });
    });

    it.each([
      [409, problem('catalog.tag-name-taken'), { kind: 'name-taken' }],
      [401, problem('identity.account-deleted'), { kind: 'unauthenticated' }],
      [401, undefined, { kind: 'unauthenticated' }],
      [403, problem('identity.capability-required'), { kind: 'forbidden' }],
      [400, problem('tag.name-too-long'), { kind: 'outdated' }],
      [500, undefined, { kind: 'unreachable' }],
    ])('should translate the answer %i %j', async (status, body, failure) => {
      const gateway = createTagListGateway(apiAnswering(status, body));

      expect(await gateway.addTag({ name: 'pop', description: 'D.', scope: 'transitions' })).toEqual(
        fail(failure),
      );
    });
  });

  describe('changeTag', () => {
    it('should put the name and the description of the tag and read it back', async () => {
      const requests: Request[] = [];
      const gateway = createTagListGateway(apiAnswering(200, pop, requests));

      expect(
        await gateway.changeTag('tag-pop', { name: 'pop', description: 'D.', scope: 'transitions' }),
      ).toEqual(ok(pop));
      expect(requests[0]?.method).toBe('PUT');
      expect(new URL(requests[0]!.url).pathname).toBe('/catalog/tags/tag-pop');
    });

    // Story 9a (ADR 0035, ADR 0036): a narrower scope refused by what carries the tag or by the tags around it.
    it('should read the poses and the pending proposals carrying the tag when they forbid narrowing it', async () => {
      const gateway = createTagListGateway(
        apiAnswering(
          409,
          problem('catalog.tag-carried', {
            poses: [{ id: 'p-leaf', name: 'Folded Leaf' }],
            transitions: [],
            pendingProposals: [],
            pendingPoses: [{ id: 'r-1', kind: 'pose-revision', name: 'Throne' }],
          }),
        ),
      );

      expect(
        await gateway.changeTag('tag-lunaire', { name: 'lunaire', description: 'D.', scope: 'transitions' }),
      ).toEqual(
        fail({
          kind: 'carried',
          poses: [{ id: 'p-leaf', name: 'Folded Leaf' }],
          transitions: [],
          pendingProposals: [],
          pendingPoses: [{ id: 'r-1', kind: 'pose-revision', name: 'Throne' }],
        }),
      );
    });

    it('should read the tags implying it when they still need what it applies to', async () => {
      const gateway = createTagListGateway(
        apiAnswering(
          409,
          problem('catalog.tag-scope-needed-by-impliers', { impliedBy: [{ id: 'tag-pop', name: 'pop' }] }),
        ),
      );

      expect(
        await gateway.changeTag('tag-dynamique', { name: 'dynamique', description: 'D.', scope: 'poses' }),
      ).toEqual(fail({ kind: 'scope-needed-by-impliers', impliedBy: [{ id: 'tag-pop', name: 'pop' }] }));
    });

    it('should tell the tag it adds does not apply as widely when the API refuses for that', async () => {
      const gateway = createTagListGateway(apiAnswering(409, problem('catalog.tag-scope-exceeds-implied')));

      expect(
        await gateway.changeTag('tag-pop', {
          name: 'pop',
          description: 'D.',
          scope: 'poses-and-transitions',
        }),
      ).toEqual(fail({ kind: 'scope-exceeds-implied' }));
    });

    it('should tell the tag is no longer in the list when the API does not find it', async () => {
      const gateway = createTagListGateway(apiAnswering(404, problem('catalog.tag-not-found')));

      expect(
        await gateway.changeTag('tag-pop', { name: 'pop', description: 'D.', scope: 'transitions' }),
      ).toEqual(fail({ kind: 'not-found' }));
    });
  });

  describe('removeTag', () => {
    it('should delete the tag when the API accepts', async () => {
      const requests: Request[] = [];
      const gateway = createTagListGateway(apiAnswering(204, undefined, requests));

      expect(await gateway.removeTag('tag-vrille')).toEqual(ok(undefined));
      expect(requests[0]?.method).toBe('DELETE');
      expect(new URL(requests[0]!.url).pathname).toBe('/catalog/tags/tag-vrille');
    });

    it('should read the carriers of the tag when transitions or proposals carry it', async () => {
      const birdToLeaf = {
        id: 't-1',
        fromPose: { id: 'p-bird', name: 'Bird' },
        toPose: { id: 'p-leaf', name: 'Folded Leaf' },
        name: null,
      };
      const gateway = createTagListGateway(
        apiAnswering(
          409,
          problem('catalog.tag-carried', { transitions: [birdToLeaf], pendingProposals: [] }),
        ),
      );

      expect(await gateway.removeTag('tag-lunaire')).toEqual(
        fail({
          kind: 'carried',
          poses: [],
          transitions: [birdToLeaf],
          pendingProposals: [],
          pendingPoses: [],
        }),
      );
    });

    it('should read the poses and the pending pose proposals carrying the tag when they forbid removing it', async () => {
      const gateway = createTagListGateway(
        apiAnswering(
          409,
          problem('catalog.tag-carried', {
            poses: [{ id: 'p-leaf', name: 'Folded Leaf' }],
            transitions: [],
            pendingProposals: [],
            pendingPoses: [{ id: 'pp-1', kind: 'pose-proposal', name: 'Candlestick' }],
          }),
        ),
      );

      expect(await gateway.removeTag('tag-inversion')).toEqual(
        fail({
          kind: 'carried',
          poses: [{ id: 'p-leaf', name: 'Folded Leaf' }],
          transitions: [],
          pendingProposals: [],
          pendingPoses: [{ id: 'pp-1', kind: 'pose-proposal', name: 'Candlestick' }],
        }),
      );
    });

    it('should read the tags implying it when a tag of the list adds it', async () => {
      const gateway = createTagListGateway(
        apiAnswering(409, problem('catalog.tag-implied', { impliedBy: [{ id: 'tag-pop', name: 'pop' }] })),
      );

      expect(await gateway.removeTag('tag-dynamique')).toEqual(
        fail({ kind: 'implied', impliedBy: [{ id: 'tag-pop', name: 'pop' }] }),
      );
    });

    it('should tell the site is outdated when the carriers cannot be read', async () => {
      const gateway = createTagListGateway(
        apiAnswering(409, problem('catalog.tag-carried', { transitions: 'x' })),
      );

      expect(await gateway.removeTag('tag-lunaire')).toEqual(fail({ kind: 'outdated' }));
    });

    it('should tell the tag is no longer in the list when the API does not find it', async () => {
      const gateway = createTagListGateway(apiAnswering(404, problem('catalog.tag-not-found')));

      expect(await gateway.removeTag('tag-vrille')).toEqual(fail({ kind: 'not-found' }));
    });
  });
});

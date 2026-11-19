import {
  fail,
  ok,
  type AdjustmentNote,
  type RejectionReason,
  type TransitionDescription,
  type TransitionName,
} from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createContributionGateway } from './contribution-gateway';
import { createValidationGateway } from './validation-gateway';

// Story 7: transitions in the validation queue, their decisions, and « Mes propositions » (ADR 0030).

const transitionId = '3c2b1a0f-9e8d-4c7b-a6f5-e4d3c2b1a0f9';
const starId = '5f0e2f43-7d4a-4a77-8f0a-5f3bd7b4b0a1';
const star = { id: starId, name: 'Star' };

const pendingNinjaStar = {
  kind: 'transition-proposal',
  id: transitionId,
  fromPose: star,
  toPose: star,
  name: 'Ninja Star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: 'Vidéo : https://example.org/ninja-star',
  tags: [
    { id: 'tag-dynamique', name: 'dynamique' },
    { id: 'tag-pop', name: 'pop' },
  ],
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: '2026-11-14T09:00:00+00:00',
};

const aTransition = { kind: 'transition-proposal', id: transitionId } as const;

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

const problem = (status: number, title: string) => ({ title, status, detail: '…' });

const accepted = {
  id: transitionId,
  status: 'accepted',
  adjusted: false,
  fromPose: star,
  toPose: star,
  name: 'Ninja Star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: null,
};

describe('createValidationGateway, transitions', () => {
  it('should read a transition of the queue: its poses, its name, its difficulties and its description', async () => {
    const gateway = createValidationGateway(apiAnswering(200, { proposals: [pendingNinjaStar] }));

    expect(await gateway.getValidationQueue()).toEqual(
      ok([
        {
          kind: 'transition-proposal',
          id: transitionId,
          fromPose: star,
          toPose: star,
          transition: {
            name: 'Ninja Star',
            baseDifficulty: 'advanced',
            flyerDifficulty: 'advanced',
            description: 'Vidéo : https://example.org/ninja-star',
            tags: [
              { id: 'tag-dynamique', name: 'dynamique' },
              { id: 'tag-pop', name: 'pop' },
            ],
          },
          contributor: { email: 'alice@example.org', isYou: false },
          submittedAt: new Date('2026-11-14T09:00:00Z'),
        },
      ]),
    );
  });

  it('should read a transition without a name nor a description', async () => {
    const gateway = createValidationGateway(
      apiAnswering(200, { proposals: [{ ...pendingNinjaStar, name: null, description: null }] }),
    );

    const queue = await gateway.getValidationQueue();

    expect(queue.ok && queue.value[0]).toMatchObject({ transition: { name: null, description: null } });
  });

  it.each([
    ['a pose it cannot read', { toPose: { id: starId } }],
    ['a tag without its name', { tags: [{ id: 'tag-pop' }] }],
    ['no list of tags', { tags: undefined }],
  ])('should report a transition it cannot read (%s) as an outdated site', async (_case, change) => {
    const gateway = createValidationGateway(
      apiAnswering(200, { proposals: [{ ...pendingNinjaStar, ...change }] }),
    );

    expect(await gateway.getValidationQueue()).toEqual(fail({ kind: 'outdated' }));
  });

  it('should read the tags of the list from GET /catalog/tags, to adjust those of a transition', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(
      apiAnswering(
        200,
        {
          tags: [
            {
              id: 'tag-pop',
              name: 'pop',
              description: 'Propulsé.',
              impliedTagId: null,
              scope: 'transitions',
              transitionCount: 0,
            },
          ],
        },
        requests,
      ),
    );

    expect(await gateway.listTags()).toEqual(
      ok([
        { id: 'tag-pop', name: 'pop', description: 'Propulsé.', impliedTagId: null, scope: 'transitions' },
      ]),
    );
    expect(new URL(requests[0]!.url).pathname).toBe('/catalog/tags');
  });

  it('should accept a transition at its own address, as proposed', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(apiAnswering(200, accepted, requests));

    const result = await gateway.acceptTransitionProposal(aTransition, { adjustments: [], note: null });

    expect(result).toEqual(ok({ name: 'Ninja Star', fromPose: star, toPose: star, adjusted: false }));
    expect(new URL(requests[0]!.url).pathname).toBe(
      `/contribution/transition-proposals/${transitionId}/acceptance`,
    );
    expect(await requests[0]!.json()).toEqual({});
  });

  it('should send the adjusted values only, a removed name or description as an empty text', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(apiAnswering(200, { ...accepted, adjusted: true }, requests));

    await gateway.acceptTransitionProposal(aTransition, {
      adjustments: [
        { field: 'name', proposed: 'Ninja Star' as TransitionName, retained: null },
        { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'advanced' },
        {
          field: 'description',
          proposed: null,
          retained: 'Rotation complète.' as TransitionDescription,
        },
      ],
      note: 'Nom retiré : il désigne une autre transition.' as AdjustmentNote,
    });

    expect(await requests[0]!.json()).toEqual({
      name: '',
      flyerDifficulty: 'advanced',
      description: 'Rotation complète.',
      message: 'Nom retiré : il désigne une autre transition.',
    });
  });

  it('should send the retained tags by identifier, all of them, when they are adjusted', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(apiAnswering(200, { ...accepted, adjusted: true }, requests));

    await gateway.acceptTransitionProposal(aTransition, {
      adjustments: [
        {
          field: 'tags',
          proposed: [],
          retained: [
            { id: 'tag-dynamique', name: 'dynamique' },
            { id: 'tag-pop', name: 'pop' },
          ],
        },
      ],
      note: null,
    });

    expect(await requests[0]!.json()).toEqual({ tagIds: ['tag-dynamique', 'tag-pop'] });
  });

  it('should send no tag when they are all removed', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(apiAnswering(200, { ...accepted, adjusted: true }, requests));

    await gateway.acceptTransitionProposal(aTransition, {
      adjustments: [{ field: 'tags', proposed: [{ id: 'tag-pop', name: 'pop' }], retained: [] }],
      note: null,
    });

    expect(await requests[0]!.json()).toEqual({ tagIds: [] });
  });

  it.each([
    ['contribution.tag-not-in-list', 'tags-not-in-list'],
    ['contribution.transition-name-already-in-catalog', 'transition-name-already-in-catalog'],
    ['contribution.transition-name-already-pending', 'transition-name-already-pending'],
    ['contribution.unnamed-transition-already-in-catalog', 'unnamed-transition-already-in-catalog'],
    ['contribution.unnamed-transition-already-pending', 'unnamed-transition-already-pending'],
    ['contribution.proposal-already-decided', 'already-decided'],
  ])('should report the refusal "409 %s" as "%s"', async (title, kind) => {
    const gateway = createValidationGateway(apiAnswering(409, problem(409, title)));

    expect(await gateway.acceptTransitionProposal(aTransition, { adjustments: [], note: null })).toEqual(
      fail({ kind }),
    );
  });

  it.each(['contribution.from-pose-not-found', 'contribution.to-pose-not-found'])(
    'should report "404 %s" as a pose of the transition gone from the catalog',
    async (title) => {
      const gateway = createValidationGateway(apiAnswering(404, problem(404, title)));

      expect(await gateway.acceptTransitionProposal(aTransition, { adjustments: [], note: null })).toEqual(
        fail({ kind: 'transition-pose-not-found' }),
      );
    },
  );

  it('should reject a transition at its own address', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(
      apiAnswering(200, { id: transitionId, status: 'rejected' }, requests),
    );

    await gateway.rejectProposal(aTransition, 'Doublon.' as RejectionReason);

    expect(new URL(requests[0]!.url).pathname).toBe(
      `/contribution/transition-proposals/${transitionId}/rejection`,
    );
  });
});

const none = { decidedAt: null, adjustments: null, message: null, reason: null };

const myThroneToBird = {
  kind: 'transition-proposal',
  id: transitionId,
  status: 'pending',
  fromPose: { id: 'pose-throne', name: 'Throne' },
  toPose: { id: 'pose-bird', name: 'Bird' },
  name: null,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'beginner',
  description: null,
  tags: [],
  submittedAt: '2026-11-14T09:00:00+00:00',
  ...none,
};

describe('createContributionGateway, getMyProposals of transitions', () => {
  it('should read a transition of the requester: its poses, the transition, its status', async () => {
    const gateway = createContributionGateway(apiAnswering(200, { proposals: [myThroneToBird] }));

    expect(await gateway.getMyProposals()).toEqual(
      ok([
        {
          kind: 'transition-proposal',
          id: transitionId,
          fromPose: { id: 'pose-throne', name: 'Throne' },
          toPose: { id: 'pose-bird', name: 'Bird' },
          transition: {
            name: null,
            baseDifficulty: 'beginner',
            flyerDifficulty: 'beginner',
            description: null,
            tags: [],
          },
          submittedAt: new Date('2026-11-14T09:00:00Z'),
          status: { kind: 'pending' },
        },
      ]),
    );
  });

  it('should read the adjustments of a transition, a name or a description possibly absent on one side', async () => {
    const gateway = createContributionGateway(
      apiAnswering(200, {
        proposals: [
          {
            ...myThroneToBird,
            status: 'accepted-with-adjustments',
            name: 'Ninja Star',
            decidedAt: '2026-11-15T10:00:00+00:00',
            adjustments: {
              name: { proposed: null, retained: 'Ninja Star' },
              baseDifficulty: null,
              flyerDifficulty: { proposed: 'beginner', retained: 'advanced' },
              tags: { proposed: [], retained: [{ id: 'tag-pop', name: 'pop' }] },
              description: { proposed: 'Vidéo', retained: null },
            },
            message: 'Nom usuel.',
          },
        ],
      }),
    );

    const proposals = await gateway.getMyProposals();

    expect(proposals.ok && proposals.value[0]?.status).toEqual({
      kind: 'accepted-with-adjustments',
      decidedAt: new Date('2026-11-15T10:00:00Z'),
      adjustments: [
        { field: 'name', proposed: null, retained: 'Ninja Star' },
        { field: 'flyerDifficulty', proposed: 'beginner', retained: 'advanced' },
        { field: 'tags', proposed: [], retained: [{ id: 'tag-pop', name: 'pop' }] },
        { field: 'description', proposed: 'Vidéo', retained: null },
      ],
      message: 'Nom usuel.',
    });
  });

  it('should report a transition it cannot read as an outdated site', async () => {
    const gateway = createContributionGateway(
      apiAnswering(200, { proposals: [{ ...myThroneToBird, baseDifficulty: 'expert' }] }),
    );

    expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
  });
});

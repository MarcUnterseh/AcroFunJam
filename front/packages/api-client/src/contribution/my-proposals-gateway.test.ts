import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createContributionGateway } from './contribution-gateway';

const throneId = '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10';

const none = { decidedAt: null, adjustments: null, message: null, reason: null };

const pendingThrone = {
  kind: 'pose-proposal',
  id: throneId,
  status: 'pending',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  tags: [],
  submittedAt: '2026-11-03T09:00:00+00:00',
  ...none,
};

const revisionId = '2a1b3c4d-5e6f-4a0b-8c9d-0e1f2a3b4c5d';
const noChange = {
  name: null,
  baseDifficulty: null,
  flyerDifficulty: null,
  canStartFlow: null,
  canEndFlow: null,
};

/** Story 6: Alice proposes to change the flyer difficulty of Throne, intermediate, to discovery. */
const pendingRevision = {
  kind: 'pose-revision',
  id: revisionId,
  status: 'pending',
  poseName: 'Throne',
  submittedAt: '2026-11-12T09:00:00+00:00',
  changes: { ...noChange, flyerDifficulty: { before: 'intermediate', after: 'discovery' } },
  ...none,
};

const thronePose = {
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  tags: [],
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

describe('createContributionGateway, getMyProposals', () => {
  it('should read the proposals of the requester from GET /contribution/my-proposals', async () => {
    const requests: Request[] = [];
    const gateway = createContributionGateway(apiAnswering(200, { proposals: [pendingThrone] }, requests));

    const proposals = await gateway.getMyProposals();

    expect(requests[0]!.method).toBe('GET');
    expect(new URL(requests[0]!.url).pathname).toBe('/contribution/my-proposals');
    expect(proposals).toEqual(
      ok([
        {
          kind: 'pose-proposal',
          id: throneId,
          pose: thronePose,
          submittedAt: new Date('2026-11-03T09:00:00Z'),
          status: { kind: 'pending' },
        },
      ]),
    );
  });

  it('should read a revision: the name of the pose when proposed, and the changed fields only, before → after', async () => {
    const gateway = createContributionGateway(apiAnswering(200, { proposals: [pendingRevision] }));

    expect(await gateway.getMyProposals()).toEqual(
      ok([
        {
          kind: 'pose-revision',
          id: revisionId,
          poseName: 'Throne',
          submittedAt: new Date('2026-11-12T09:00:00Z'),
          status: { kind: 'pending' },
          changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' }],
        },
      ]),
    );
  });

  it('should read the adjustments of a revision accepted with adjustments, as for a pose proposal', async () => {
    const accepted = {
      ...pendingRevision,
      status: 'accepted-with-adjustments',
      decidedAt: '2026-11-13T10:00:00+00:00',
      changes: { ...noChange, flyerDifficulty: { before: 'intermediate', after: 'beginner' } },
      adjustments: { ...noChange, flyerDifficulty: { proposed: 'discovery', retained: 'beginner' } },
      message: 'Débutant plutôt.',
    };
    const answer = await createContributionGateway(
      apiAnswering(200, { proposals: [accepted] }),
    ).getMyProposals();

    expect(answer.ok && answer.value[0]).toMatchObject({
      status: {
        kind: 'accepted-with-adjustments',
        decidedAt: new Date('2026-11-13T10:00:00Z'),
        adjustments: [{ field: 'flyerDifficulty', proposed: 'discovery', retained: 'beginner' }],
        message: 'Débutant plutôt.',
      },
      changes: [{ field: 'flyerDifficulty', before: 'intermediate', after: 'beginner' }],
    });
  });

  it.each([
    { ...pendingThrone, kind: 'pose-merge' },
    { ...pendingThrone, kind: undefined },
    { ...pendingRevision, poseName: null },
    { ...pendingRevision, changes: noChange },
    { ...pendingRevision, changes: { ...noChange, baseDifficulty: { before: 'beginner', after: 'expert' } } },
  ])(
    'should tell the site is outdated when a proposal of an unknown kind or shape is received (%o)',
    async (unreadable) => {
      const gateway = createContributionGateway(
        apiAnswering(200, { proposals: [pendingThrone, unreadable] }),
      );

      expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
    },
  );

  it.each([
    [401, 'Unauthorized', 'unauthenticated'],
    [401, 'identity.account-deleted', 'unauthenticated'],
    [403, 'identity.capability-required', 'unauthenticated'],
    [500, 'Internal Server Error', 'unreachable'],
    [503, 'Service Unavailable', 'unreachable'],
    [422, 'contribution.some-new-rule', 'outdated'],
  ])('should report "%i %s" as "%s"', async (status, title, kind) => {
    const gateway = createContributionGateway(apiAnswering(status, { title, status, detail: '…' }));

    expect(await gateway.getMyProposals()).toEqual(fail({ kind }));
  });

  it('should report an unreachable API when the request cannot reach it', async () => {
    const gateway = createContributionGateway(
      createApiClient({
        baseUrl: 'http://api.test',
        fetch: async () => {
          throw new TypeError('Failed to fetch');
        },
      }),
    );

    expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'unreachable' }));
  });

  const statusOf = async (proposal: object) => {
    const answer = await createContributionGateway(
      apiAnswering(200, { proposals: [{ ...pendingThrone, ...proposal }] }),
    ).getMyProposals();
    return answer.ok ? answer.value[0]!.status : answer;
  };

  it('should read an acceptance and its decision date', async () => {
    expect(await statusOf({ status: 'accepted', decidedAt: '2026-11-05T10:00:00+00:00' })).toEqual({
      kind: 'accepted',
      decidedAt: new Date('2026-11-05T10:00:00Z'),
    });
  });

  it('should read a rejection, its decision date and its reason', async () => {
    const rejected = {
      status: 'rejected',
      decidedAt: '2026-11-05T10:00:00+00:00',
      reason: 'Doublon de Bird, déjà au catalogue.',
    };

    expect(await statusOf(rejected)).toEqual({
      kind: 'rejected',
      decidedAt: new Date('2026-11-05T10:00:00Z'),
      reason: 'Doublon de Bird, déjà au catalogue.',
    });
  });

  it('should read a pose published directly, without a decision date', async () => {
    expect(await statusOf({ status: 'published-directly' })).toEqual({ kind: 'published-directly' });
  });

  it('should read the adjusted fields only, in the order of the form, and the message', async () => {
    const adjusted = {
      status: 'accepted-with-adjustments',
      decidedAt: '2026-11-05T10:00:00+00:00',
      adjustments: {
        name: { proposed: 'throne', retained: 'Throne' },
        baseDifficulty: null,
        flyerDifficulty: { proposed: 'intermediate', retained: 'discovery' },
        canStartFlow: null,
        canEndFlow: { proposed: true, retained: false },
      },
      message: 'Le flyer ne redescend pas sans danger depuis cette pose.',
    };

    expect(await statusOf(adjusted)).toEqual({
      kind: 'accepted-with-adjustments',
      decidedAt: new Date('2026-11-05T10:00:00Z'),
      adjustments: [
        { field: 'name', proposed: 'throne', retained: 'Throne' },
        { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' },
        { field: 'canEndFlow', proposed: true, retained: false },
      ],
      message: 'Le flyer ne redescend pas sans danger depuis cette pose.',
    });
  });

  // An API newer than the site: only the card concerned says its status cannot be read.
  it.each([
    { status: 'withdrawn' },
    { status: 'accepted', decidedAt: null },
    { status: 'accepted', decidedAt: 'hier' },
    { status: 'rejected', decidedAt: '2026-11-05T10:00:00+00:00', reason: null },
    { status: 'accepted-with-adjustments', decidedAt: '2026-11-05T10:00:00+00:00', adjustments: null },
    {
      status: 'accepted-with-adjustments',
      decidedAt: '2026-11-05T10:00:00+00:00',
      adjustments: {
        name: null,
        baseDifficulty: null,
        flyerDifficulty: { proposed: 'intermediate', retained: 'expert' },
        canStartFlow: null,
        canEndFlow: null,
      },
    },
  ])('should tell the status is unknown when it cannot be read (%o)', async (unreadable) => {
    expect(await statusOf(unreadable)).toEqual({ kind: 'unknown' });
  });

  it.each([
    { ...pendingThrone, flyerDifficulty: 'expert' },
    { ...pendingThrone, canEndFlow: null },
    { ...pendingThrone, submittedAt: 'hier' },
    { ...pendingThrone, id: 42 },
  ])(
    'should tell the site is outdated when the pose of a proposal cannot be read (%o)',
    async (unreadable) => {
      const gateway = createContributionGateway(
        apiAnswering(200, { proposals: [pendingThrone, unreadable] }),
      );

      expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
    },
  );

  it.each([{}, { proposals: null }, { proposals: 'none' }])(
    'should tell the site is outdated when the list cannot be read (%o)',
    async (unreadable) => {
      const gateway = createContributionGateway(apiAnswering(200, unreadable));

      expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
    },
  );
});

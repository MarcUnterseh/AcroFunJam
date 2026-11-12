import { fail, ok } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createContributionGateway } from './contribution-gateway';

const throneId = '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10';

const none = { decidedAt: null, adjustments: null, message: null, reason: null };

const pendingThrone = {
  id: throneId,
  status: 'pending',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  submittedAt: '2026-11-03T09:00:00+00:00',
  ...none,
};

const thronePose = {
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
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
  it('should read the proposals of the requester from GET /contribution/my-pose-proposals', async () => {
    const requests: Request[] = [];
    const gateway = createContributionGateway(apiAnswering(200, { proposals: [pendingThrone] }, requests));

    const proposals = await gateway.getMyProposals();

    expect(requests[0]!.method).toBe('GET');
    expect(new URL(requests[0]!.url).pathname).toBe('/contribution/my-pose-proposals');
    expect(proposals).toEqual(
      ok([
        {
          id: throneId,
          pose: thronePose,
          submittedAt: new Date('2026-11-03T09:00:00Z'),
          status: { kind: 'pending' },
        },
      ]),
    );
  });

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
  ])('should tell the site is outdated when the pose of a proposal cannot be read (%o)', async (unreadable) => {
    const gateway = createContributionGateway(apiAnswering(200, { proposals: [pendingThrone, unreadable] }));

    expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
  });

  it.each([{}, { proposals: null }, { proposals: 'none' }])(
    'should tell the site is outdated when the list cannot be read (%o)',
    async (unreadable) => {
      const gateway = createContributionGateway(apiAnswering(200, unreadable));

      expect(await gateway.getMyProposals()).toEqual(fail({ kind: 'outdated' }));
    },
  );
});

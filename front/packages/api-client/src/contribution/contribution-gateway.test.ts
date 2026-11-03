import { fail, ok, type PoseName, type ValidPoseProposal } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createContributionGateway } from './contribution-gateway';

const throne: ValidPoseProposal = {
  name: 'Throne' as PoseName,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
};

const received = (status: 'pending' | 'accepted') => ({
  id: '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10',
  status,
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
});

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

describe('createContributionGateway', () => {
  it('should send the proposal to POST /contribution/pose-proposals when proposing a pose', async () => {
    const requests: Request[] = [];
    const gateway = createContributionGateway(apiAnswering(201, received('pending'), requests));

    await gateway.proposePose(throne);

    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe('POST');
    expect(new URL(requests[0]!.url).pathname).toBe('/contribution/pose-proposals');
    expect(await requests[0]!.json()).toEqual(throne);
  });

  it('should tell the proposal is pending when the API answers 201 "pending"', async () => {
    const gateway = createContributionGateway(apiAnswering(201, received('pending')));

    expect(await gateway.proposePose(throne)).toEqual(ok({ status: 'pending', name: 'Throne' }));
  });

  it('should tell the pose is published when the API answers 201 "accepted"', async () => {
    const gateway = createContributionGateway(apiAnswering(201, received('accepted')));

    expect(await gateway.proposePose(throne)).toEqual(ok({ status: 'published', name: 'Throne' }));
  });

  it.each([
    ['contribution.pose-name-already-in-catalog', 'name-already-in-catalog'],
    ['contribution.pose-name-already-pending', 'name-already-pending'],
  ])('should report the refusal of the name when the API answers 409 %s', async (code, kind) => {
    const gateway = createContributionGateway(apiAnswering(409, problem(409, code)));

    expect(await gateway.proposePose(throne)).toEqual(fail({ kind }));
  });

  it.each([
    ['pose.name-required', 'name'],
    ['pose.name-too-long', 'name'],
    ['pose.base-difficulty-required', 'baseDifficulty'],
    ['pose.flyer-difficulty-required', 'flyerDifficulty'],
    ['pose.can-start-flow-required', 'canStartFlow'],
    ['pose.can-end-flow-required', 'canEndFlow'],
  ])('should report the field in error when the API answers 400 %s', async (code, field) => {
    const gateway = createContributionGateway(apiAnswering(400, problem(400, code)));

    expect(await gateway.proposePose(throne)).toEqual(
      fail({ kind: 'invalid-content', errors: [{ field, code }] }),
    );
  });

  it.each([
    [401, 'Unauthorized'],
    [401, 'contribution.unknown-contributor'],
    [401, 'identity.account-deleted'],
    [403, 'identity.capability-required'],
  ])('should report an unauthenticated person when the API answers %i %s', async (status, title) => {
    const gateway = createContributionGateway(apiAnswering(status, problem(status, title)));

    expect(await gateway.proposePose(throne)).toEqual(fail({ kind: 'unauthenticated' }));
  });

  it.each([500, 503])('should report that the API cannot be reached when it answers %i', async (status) => {
    const gateway = createContributionGateway(apiAnswering(status, problem(status, 'Internal Server Error')));

    expect(await gateway.proposePose(throne)).toEqual(fail({ kind: 'unreachable' }));
  });

  it('should report that the API cannot be reached when the network fails', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await createContributionGateway(client).proposePose(throne)).toEqual(
      fail({ kind: 'unreachable' }),
    );
  });

  it.each([
    [400, problem(400, 'pose.unknown-difficulty-level')],
    [409, problem(409, 'catalog.something-new')],
    [422, problem(422, 'contribution.some-new-rule')],
  ])(
    'should tell the site is outdated when the API refuses with a code it does not know (%i)',
    async (status, body) => {
      const gateway = createContributionGateway(apiAnswering(status, body));

      expect(await gateway.proposePose(throne)).toEqual(fail({ kind: 'outdated' }));
    },
  );

  it.each([{ ...received('pending'), status: 'archived' }, {}])(
    'should only tell the proposal is received when its status cannot be read (%o)',
    async (body) => {
      const gateway = createContributionGateway(apiAnswering(201, body));

      expect(await gateway.proposePose(throne)).toEqual(ok({ status: 'received', name: 'Throne' }));
    },
  );

  it('should send exactly the fields of the contract, nothing more', async () => {
    const requests: Request[] = [];
    const gateway = createContributionGateway(apiAnswering(201, received('pending'), requests));

    await gateway.proposePose({ ...throne, extra: 'not sent' } as ValidPoseProposal);

    expect(Object.keys(await requests[0]!.json())).toEqual([
      'name',
      'baseDifficulty',
      'flyerDifficulty',
      'canStartFlow',
      'canEndFlow',
    ]);
  });
});

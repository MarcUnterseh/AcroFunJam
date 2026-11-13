import { fail, ok, type TransitionDescription, type TransitionName } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createTransitionProposalGateway } from './transition-proposal-gateway';

const throneId = '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10';
const birdId = '6f0d3c2a-9c71-4b1e-a7a2-1f4e5d6c7b80';

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

const networkDown = () =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

const pose = (id: string, name: string) => ({
  id,
  name,
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
});

const ninjaStar = {
  fromPoseId: throneId,
  toPoseId: birdId,
  name: 'Ninja Star' as TransitionName,
  baseDifficulty: 'advanced' as const,
  flyerDifficulty: 'advanced' as const,
  description: 'Vidéo : https://example.org/ninja-star' as TransitionDescription,
};

const received = (status: string) => ({
  id: 't-1',
  status,
  fromPose: { id: throneId, name: 'Throne' },
  toPose: { id: birdId, name: 'Bird' },
  name: 'Ninja Star',
  baseDifficulty: 'advanced',
  flyerDifficulty: 'advanced',
  description: 'Vidéo : https://example.org/ninja-star',
});

describe('createTransitionProposalGateway', () => {
  describe('listPublishedPoses', () => {
    it('should read the published poses, by id and name, in catalog order', async () => {
      const requests: Request[] = [];
      const gateway = createTransitionProposalGateway(
        apiAnswering(200, { poses: [pose(birdId, 'Bird'), pose(throneId, 'Throne')] }, requests),
      );

      expect(await gateway.listPublishedPoses()).toEqual(
        ok([
          { id: birdId, name: 'Bird' },
          { id: throneId, name: 'Throne' },
        ]),
      );
      expect(new URL(requests[0]!.url).pathname).toBe('/catalog/poses');
    });

    it('should report a failure to read them as unreachable or outdated', async () => {
      expect(await createTransitionProposalGateway(networkDown()).listPublishedPoses()).toEqual(
        fail({ kind: 'unreachable' }),
      );
      expect(await createTransitionProposalGateway(apiAnswering(503)).listPublishedPoses()).toEqual(
        fail({ kind: 'unreachable' }),
      );
      expect(
        await createTransitionProposalGateway(apiAnswering(200, { poses: [{ id: 1 }] })).listPublishedPoses(),
      ).toEqual(fail({ kind: 'outdated' }));
    });
  });

  describe('proposeTransition', () => {
    it('should send the transition to POST /contribution/transition-proposals, field by field', async () => {
      const requests: Request[] = [];
      const gateway = createTransitionProposalGateway(apiAnswering(201, received('pending'), requests));

      await gateway.proposeTransition(ninjaStar);

      expect(new URL(requests[0]!.url).pathname).toBe('/contribution/transition-proposals');
      expect(requests[0]!.method).toBe('POST');
      expect(await requests[0]!.json()).toEqual(ninjaStar);
    });

    it('should send null for a transition without a name nor a description', async () => {
      const requests: Request[] = [];
      const gateway = createTransitionProposalGateway(apiAnswering(201, received('pending'), requests));

      await gateway.proposeTransition({ ...ninjaStar, name: null, description: null });

      expect(await requests[0]!.json()).toMatchObject({ name: null, description: null });
    });

    it.each([
      ['pending', 'pending'],
      ['accepted', 'published'],
      ['something-new', 'received'],
    ])(
      'should report the status "%s" as "%s", with the poses under their current names',
      async (status, outcome) => {
        const gateway = createTransitionProposalGateway(apiAnswering(201, received(status)));

        expect(await gateway.proposeTransition(ninjaStar)).toEqual(
          ok({
            status: outcome,
            fromPose: { id: throneId, name: 'Throne' },
            toPose: { id: birdId, name: 'Bird' },
            name: 'Ninja Star',
          }),
        );
      },
    );

    it('should only report the transition as received when its poses cannot be read (nothing is promised)', async () => {
      const gateway = createTransitionProposalGateway(
        apiAnswering(201, { ...received('pending'), toPose: { id: birdId } }),
      );

      const result = await gateway.proposeTransition(ninjaStar);

      expect(result.ok && result.value.status).toBe('received');
    });

    it.each([
      [409, 'contribution.transition-name-already-in-catalog', 'transition-name-already-in-catalog'],
      [409, 'contribution.transition-name-already-pending', 'transition-name-already-pending'],
      [409, 'contribution.unnamed-transition-already-in-catalog', 'unnamed-transition-already-in-catalog'],
      [409, 'contribution.unnamed-transition-already-pending', 'unnamed-transition-already-pending'],
      [404, 'contribution.from-pose-not-found', 'from-pose-not-found'],
      [404, 'contribution.to-pose-not-found', 'to-pose-not-found'],
      [401, 'Unauthorized', 'unauthenticated'],
      [403, 'identity.capability-required', 'unauthenticated'],
      [503, 'Service Unavailable', 'unreachable'],
      [400, 'transition.name-too-long', 'outdated'],
      [409, 'something.new', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createTransitionProposalGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.proposeTransition(ninjaStar)).toEqual(fail({ kind }));
    });

    it('should report a network failure as unreachable', async () => {
      expect(await createTransitionProposalGateway(networkDown()).proposeTransition(ninjaStar)).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });
});

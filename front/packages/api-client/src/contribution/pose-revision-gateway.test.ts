import { fail, ok, type PoseName, type RevisionMessage } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createPoseRevisionGateway } from './pose-revision-gateway';

const throneId = '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10';

const publishedThrone = {
  id: throneId,
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'intermediate',
  canStartFlow: true,
  canEndFlow: true,
  tags: [],
  version: 3,
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

const problem = (status: number, title: string) => ({ title, status, detail: '…' });

const networkDown = () =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

describe('createPoseRevisionGateway', () => {
  describe('getRevisablePose', () => {
    it('should read the published pose and its version from GET /catalog/poses/{id}', async () => {
      const requests: Request[] = [];
      const gateway = createPoseRevisionGateway(apiAnswering(200, publishedThrone, requests));

      expect(await gateway.getRevisablePose(throneId)).toEqual(ok({ ...publishedThrone, name: 'Throne' }));
      expect(new URL(requests[0]!.url).pathname).toBe(`/catalog/poses/${throneId}`);
    });

    it.each([
      [404, 'catalog.pose-not-found', 'not-found'],
      [401, 'Unauthorized', 'unauthenticated'],
      [503, 'Service Unavailable', 'unreachable'],
      [400, 'something.new', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createPoseRevisionGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.getRevisablePose(throneId)).toEqual(fail({ kind }));
    });

    it.each([
      { ...publishedThrone, baseDifficulty: 'expert' },
      { ...publishedThrone, version: 'trois' },
      { ...publishedThrone, version: '' },
      { ...publishedThrone, version: 0 },
      { ...publishedThrone, version: 2.5 },
      { ...publishedThrone, canEndFlow: null },
    ])('should tell the site is outdated when the pose cannot be read (%o)', async (unreadable) => {
      const gateway = createPoseRevisionGateway(apiAnswering(200, unreadable));

      expect(await gateway.getRevisablePose(throneId)).toEqual(fail({ kind: 'outdated' }));
    });

    it('should report that the API cannot be reached when the network fails', async () => {
      expect(await createPoseRevisionGateway(networkDown()).getRevisablePose(throneId)).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });

  describe('getPendingRevision', () => {
    it('should read the pending revision of the pose from GET /contribution/pose-revision-proposals/pending', async () => {
      const requests: Request[] = [];
      const gateway = createPoseRevisionGateway(
        apiAnswering(200, { pendingRevision: { isYours: true } }, requests),
      );

      expect(await gateway.getPendingRevision(throneId)).toEqual(ok({ isYours: true }));
      const url = new URL(requests[0]!.url);
      expect(url.pathname).toBe('/contribution/pose-revision-proposals/pending');
      expect(url.searchParams.get('poseId')).toBe(throneId);
    });

    it('should give no pending revision when the pose has none', async () => {
      const gateway = createPoseRevisionGateway(apiAnswering(200, { pendingRevision: null }));

      expect(await gateway.getPendingRevision(throneId)).toEqual(ok(null));
    });

    it('should report an expired session as such', async () => {
      const gateway = createPoseRevisionGateway(apiAnswering(401, problem(401, 'Unauthorized')));

      expect(await gateway.getPendingRevision(throneId)).toEqual(fail({ kind: 'unauthenticated' }));
    });
  });

  describe('proposePoseRevision', () => {
    const revision = {
      poseId: throneId,
      poseVersion: 3,
      changes: [
        { field: 'name', before: 'Throne' as PoseName, after: 'High Throne' as PoseName },
        { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
        { field: 'canEndFlow', before: true, after: false },
      ],
      message: 'Le flyer est à plat.' as RevisionMessage,
    } as const;

    const received = (status: string) => ({
      id: 'revision-id',
      status,
      poseId: throneId,
      name: 'High Throne',
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
      canStartFlow: true,
      canEndFlow: false,
      tags: [],
    });

    it('should send the changed fields only (null for the others), the version and the message to POST /contribution/pose-revision-proposals', async () => {
      const requests: Request[] = [];
      const gateway = createPoseRevisionGateway(apiAnswering(201, received('pending'), requests));

      const outcome = await gateway.proposePoseRevision(revision);

      expect(new URL(requests[0]!.url).pathname).toBe('/contribution/pose-revision-proposals');
      expect(await requests[0]!.json()).toEqual({
        poseId: throneId,
        poseVersion: 3,
        name: 'High Throne',
        baseDifficulty: null,
        flyerDifficulty: 'discovery',
        canStartFlow: null,
        canEndFlow: false,
        tagIds: null,
        message: 'Le flyer est à plat.',
      });
      expect(outcome).toEqual(ok({ status: 'pending', name: 'High Throne' }));
    });

    it('should tell a revision published directly as such', async () => {
      const gateway = createPoseRevisionGateway(apiAnswering(201, received('accepted')));

      expect(await gateway.proposePoseRevision({ ...revision, message: null })).toEqual(
        ok({ status: 'published', name: 'High Throne' }),
      );
    });

    it.each([
      [409, 'contribution.pose-name-already-in-catalog', 'name-already-in-catalog'],
      [409, 'contribution.pose-name-already-pending', 'name-already-pending'],
      [409, 'contribution.pose-changed-since-revision-started', 'pose-changed'],
      [409, 'contribution.pose-revision-already-pending', 'revision-already-pending'],
      [404, 'contribution.pose-not-found', 'not-found'],
      [422, 'contribution.revision-changes-nothing', 'changes-nothing'],
      [401, 'identity.account-deleted', 'unauthenticated'],
      [500, 'Internal Server Error', 'unreachable'],
      [400, 'pose.name-required', 'outdated'],
      [409, 'contribution.something-new', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createPoseRevisionGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.proposePoseRevision(revision)).toEqual(fail({ kind }));
    });

    it('should report that the API cannot be reached when the network fails', async () => {
      expect(await createPoseRevisionGateway(networkDown()).proposePoseRevision(revision)).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });
});

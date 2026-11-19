import { fail, ok, type AdjustmentNote, type PoseName, type RejectionReason } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createValidationGateway } from './validation-gateway';

const throneId = '0b4c8e0e-2b2f-4f55-9d3a-0e6a3c1d8f10';

const pendingThrone = {
  kind: 'pose-proposal',
  id: throneId,
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: false,
  tags: [],
  contributor: { email: 'alice@example.org', isYou: false },
  submittedAt: '2026-11-03T09:00:00+00:00',
};

const birdId = '6f0d3c2a-9c71-4b1e-a7a2-1f4e5d6c7b80';
const revisionId = '2a1b3c4d-5e6f-4a0b-8c9d-0e1f2a3b4c5d';
const noChange = {
  name: null,
  baseDifficulty: null,
  flyerDifficulty: null,
  canStartFlow: null,
  canEndFlow: null,
  tags: null,
};

const revisionOfBird = {
  kind: 'pose-revision',
  id: revisionId,
  pose: {
    id: birdId,
    name: 'Bird',
    baseDifficulty: 'discovery',
    flyerDifficulty: 'intermediate',
    canStartFlow: true,
    canEndFlow: true,
    tags: [],
  },
  changes: {
    ...noChange,
    name: { current: 'Bird', proposed: 'Front Bird' },
    flyerDifficulty: { current: 'intermediate', proposed: 'discovery' },
    canEndFlow: { current: true, proposed: false },
  },
  message: 'Le flyer est à plat.',
  contributor: { email: null, isYou: false },
  submittedAt: '2026-11-12T09:00:00+00:00',
};

const aPoseProposal = { kind: 'pose-proposal', id: throneId } as const;
const aRevision = { kind: 'pose-revision', id: revisionId } as const;

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

describe('createValidationGateway', () => {
  describe('getValidationQueue', () => {
    it('should read the pending proposals from GET /contribution/validation-queue', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(apiAnswering(200, { proposals: [pendingThrone] }, requests));

      const queue = await gateway.getValidationQueue();

      expect(new URL(requests[0]!.url).pathname).toBe('/contribution/validation-queue');
      expect(queue).toEqual(
        ok([
          {
            kind: 'pose-proposal',
            id: throneId,
            pose: {
              name: 'Throne',
              baseDifficulty: 'beginner',
              flyerDifficulty: 'discovery',
              canStartFlow: true,
              canEndFlow: false,
              tags: [],
            },
            contributor: { email: 'alice@example.org', isYou: false },
            submittedAt: new Date('2026-11-03T09:00:00Z'),
          },
        ]),
      );
    });

    it('should read a pending revision with the current values of the pose and its changed fields only', async () => {
      const gateway = createValidationGateway(
        apiAnswering(200, { proposals: [pendingThrone, revisionOfBird] }),
      );

      const queue = await gateway.getValidationQueue();

      expect(queue.ok && queue.value[1]).toEqual({
        kind: 'pose-revision',
        id: revisionId,
        pose: {
          id: birdId,
          name: 'Bird',
          baseDifficulty: 'discovery',
          flyerDifficulty: 'intermediate',
          canStartFlow: true,
          canEndFlow: true,
          tags: [],
        },
        changes: [
          { field: 'name', before: 'Bird', after: 'Front Bird' },
          { field: 'flyerDifficulty', before: 'intermediate', after: 'discovery' },
          { field: 'canEndFlow', before: true, after: false },
        ],
        message: 'Le flyer est à plat.',
        contributor: { email: null, isYou: false },
        submittedAt: new Date('2026-11-12T09:00:00Z'),
      });
    });

    it.each([
      [401, 'Unauthorized', 'unauthenticated'],
      [401, 'identity.account-deleted', 'unauthenticated'],
      [403, 'identity.capability-required', 'forbidden'],
      [500, 'Internal Server Error', 'unreachable'],
      [503, 'Service Unavailable', 'unreachable'],
      [422, 'contribution.some-new-rule', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createValidationGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.getValidationQueue()).toEqual(fail({ kind }));
    });

    it.each([
      { ...pendingThrone, flyerDifficulty: 'expert' },
      { ...pendingThrone, canEndFlow: null },
      { ...pendingThrone, submittedAt: 'hier' },
      { ...pendingThrone, kind: 'pose-merge' },
      { ...pendingThrone, kind: undefined },
      { ...revisionOfBird, pose: { ...revisionOfBird.pose, baseDifficulty: 'expert' } },
      { ...revisionOfBird, changes: { ...revisionOfBird.changes, baseDifficulty: { current: 'beginner' } } },
      {
        ...revisionOfBird,
        changes: { ...revisionOfBird.changes, canStartFlow: { current: 1, proposed: 0 } },
      },
      { ...revisionOfBird, changes: { name: null } },
      { ...revisionOfBird, changes: noChange },
      { ...revisionOfBird, message: 3 },
    ])('should tell the site is outdated when a proposal cannot be read (%o)', async (unreadable) => {
      const gateway = createValidationGateway(apiAnswering(200, { proposals: [pendingThrone, unreadable] }));

      expect(await gateway.getValidationQueue()).toEqual(fail({ kind: 'outdated' }));
    });

    it('should report that the API cannot be reached when the network fails', async () => {
      expect(await createValidationGateway(networkDown()).getValidationQueue()).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });

  describe('countPendingProposals', () => {
    it('should read the number of pending proposals from GET /contribution/validation-queue/count', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(apiAnswering(200, { count: 3 }, requests));

      expect(await gateway.countPendingProposals()).toEqual(ok(3));
      expect(new URL(requests[0]!.url).pathname).toBe('/contribution/validation-queue/count');
    });

    it.each([
      [401, 'Unauthorized', 'unauthenticated'],
      [403, 'identity.capability-required', 'forbidden'],
      [503, 'Service Unavailable', 'unreachable'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createValidationGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.countPendingProposals()).toEqual(fail({ kind }));
    });

    it('should tell the site is outdated when the number cannot be read', async () => {
      const gateway = createValidationGateway(apiAnswering(200, { count: 'trois' }));

      expect(await gateway.countPendingProposals()).toEqual(fail({ kind: 'outdated' }));
    });
  });

  describe('acceptProposal', () => {
    const accepted = (adjusted: boolean, name = 'Throne') => ({
      id: throneId,
      status: 'accepted',
      adjusted,
      name,
      baseDifficulty: 'beginner',
      flyerDifficulty: 'discovery',
      canStartFlow: true,
      canEndFlow: false,
      tags: [],
    });

    it('should send an empty acceptance to POST /contribution/pose-proposals/{id}/acceptance when accepting as proposed', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(apiAnswering(200, accepted(false), requests));

      const outcome = await gateway.acceptProposal(aPoseProposal, { adjustments: [], note: null });

      expect(requests[0]!.method).toBe('POST');
      expect(new URL(requests[0]!.url).pathname).toBe(`/contribution/pose-proposals/${throneId}/acceptance`);
      expect(await requests[0]!.json()).toEqual({});
      expect(outcome).toEqual(ok({ name: 'Throne', adjusted: false }));
    });

    it('should send the retained value of each adjusted field, and the message, when accepting with adjustments', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(apiAnswering(200, accepted(true, 'High Throne'), requests));

      const outcome = await gateway.acceptProposal(aPoseProposal, {
        adjustments: [
          { field: 'name', proposed: 'Throne' as PoseName, retained: 'High Throne' as PoseName },
          { field: 'flyerDifficulty', proposed: 'intermediate', retained: 'discovery' },
          { field: 'canEndFlow', proposed: true, retained: false },
        ],
        note: 'Throne se découvre dès la première séance côté flyer.' as AdjustmentNote,
      });

      expect(await requests[0]!.json()).toEqual({
        name: 'High Throne',
        flyerDifficulty: 'discovery',
        canEndFlow: false,
        message: 'Throne se découvre dès la première séance côté flyer.',
      });
      expect(outcome).toEqual(ok({ name: 'High Throne', adjusted: true }));
    });

    it.each([
      [409, 'contribution.proposal-already-decided', 'already-decided'],
      [404, 'contribution.proposal-not-found', 'not-found'],
      [409, 'contribution.pose-name-already-in-catalog', 'name-already-in-catalog'],
      [409, 'catalog.pose-name-taken', 'name-already-in-catalog'],
      [409, 'contribution.pose-name-already-pending', 'name-already-pending'],
      [401, 'Unauthorized', 'unauthenticated'],
      [401, 'contribution.unknown-validator', 'unauthenticated'],
      [403, 'identity.capability-required', 'forbidden'],
      [403, 'contribution.validator-required', 'forbidden'],
      [500, 'Internal Server Error', 'unreachable'],
      [400, 'pose.name-required', 'outdated'],
      [422, 'contribution.adjustment-note-without-adjustment', 'outdated'],
      [409, 'catalog.something-new', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createValidationGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.acceptProposal(aPoseProposal, { adjustments: [], note: null })).toEqual(
        fail({ kind }),
      );
    });

    it('should accept a revision at POST /contribution/pose-revision-proposals/{id}/acceptance', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(
        apiAnswering(200, { ...accepted(false), id: revisionId }, requests),
      );

      const outcome = await gateway.acceptProposal(aRevision, { adjustments: [], note: null });

      expect(new URL(requests[0]!.url).pathname).toBe(
        `/contribution/pose-revision-proposals/${revisionId}/acceptance`,
      );
      expect(outcome).toEqual(ok({ name: 'Throne', adjusted: false }));
    });

    it.each([
      [422, 'contribution.retained-revision-changes-nothing', 'retained-revision-changes-nothing'],
      [409, 'contribution.pose-changed-since-revision-started', 'pose-changed'],
      [404, 'contribution.proposal-not-found', 'not-found'],
      [404, 'contribution.pose-not-found', 'not-found'],
      [409, 'contribution.pose-name-already-in-catalog', 'name-already-in-catalog'],
    ])('should report "%i %s" as "%s" for a revision', async (status, title, kind) => {
      const gateway = createValidationGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.acceptProposal(aRevision, { adjustments: [], note: null })).toEqual(
        fail({ kind }),
      );
    });

    it('should report that the API cannot be reached when the network fails', async () => {
      const gateway = createValidationGateway(networkDown());

      expect(await gateway.acceptProposal(aPoseProposal, { adjustments: [], note: null })).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });

  describe('rejectProposal', () => {
    const reason = "Ce n'est pas une pose tenable." as RejectionReason;

    it('should send the reason to POST /contribution/pose-proposals/{id}/rejection', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(
        apiAnswering(200, { id: throneId, status: 'rejected' }, requests),
      );

      const outcome = await gateway.rejectProposal(aPoseProposal, reason);

      expect(requests[0]!.method).toBe('POST');
      expect(new URL(requests[0]!.url).pathname).toBe(`/contribution/pose-proposals/${throneId}/rejection`);
      expect(await requests[0]!.json()).toEqual({ reason });
      expect(outcome).toEqual(ok(undefined));
    });

    it('should reject a revision at POST /contribution/pose-revision-proposals/{id}/rejection', async () => {
      const requests: Request[] = [];
      const gateway = createValidationGateway(
        apiAnswering(200, { id: revisionId, status: 'rejected' }, requests),
      );

      expect(await gateway.rejectProposal(aRevision, reason)).toEqual(ok(undefined));
      expect(new URL(requests[0]!.url).pathname).toBe(
        `/contribution/pose-revision-proposals/${revisionId}/rejection`,
      );
      expect(await requests[0]!.json()).toEqual({ reason });
    });

    it.each([
      [409, 'contribution.proposal-already-decided', 'already-decided'],
      [404, 'contribution.proposal-not-found', 'not-found'],
      [401, 'identity.account-deleted', 'unauthenticated'],
      [403, 'identity.capability-required', 'forbidden'],
      [503, 'Service Unavailable', 'unreachable'],
      [400, 'contribution.rejection-reason-required', 'outdated'],
    ])('should report "%i %s" as "%s"', async (status, title, kind) => {
      const gateway = createValidationGateway(apiAnswering(status, problem(status, title)));

      expect(await gateway.rejectProposal(aPoseProposal, reason)).toEqual(fail({ kind }));
    });

    it('should report that the API cannot be reached when the network fails', async () => {
      expect(await createValidationGateway(networkDown()).rejectProposal(aPoseProposal, reason)).toEqual(
        fail({ kind: 'unreachable' }),
      );
    });
  });
});

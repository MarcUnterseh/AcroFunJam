import { ok, type PendingPoseRevision, type ValidPoseRevision } from '@acrofunjam/core';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../client';
import { createPoseRevisionGateway } from './pose-revision-gateway';
import { createValidationGateway } from './validation-gateway';

// Story 9a « Étiqueter les poses »: the tags of a pose in the contract of Contribution (ADR 0036), read and sent by
// identifier.

const apiAnswering = (status: number, body?: unknown, requests: Request[] = []) =>
  createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request) => {
      requests.push(request);
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

const lunaire = { id: 'tag-lunaire', name: 'lunaire' };
const inversion = { id: 'tag-inversion', name: 'inversion' };

const pose = {
  name: 'Folded Leaf',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
};

describe('the tags of a pose in the validation queue', () => {
  it('should read the proposed tags of a pose and the change of tags of a revision', async () => {
    const gateway = createValidationGateway(
      apiAnswering(200, {
        proposals: [
          {
            kind: 'pose-proposal',
            id: 'p-1',
            ...pose,
            tags: [lunaire],
            contributor: { email: 'alice@example.org', isYou: false },
            submittedAt: '2026-11-19T09:00:00Z',
          },
          {
            kind: 'pose-revision',
            id: 'r-1',
            pose: { id: 'pose-leaf', ...pose, tags: [] },
            changes: {
              name: null,
              baseDifficulty: null,
              flyerDifficulty: null,
              canStartFlow: null,
              canEndFlow: null,
              tags: { current: [], proposed: [lunaire] },
            },
            message: null,
            contributor: { email: 'alice@example.org', isYou: false },
            submittedAt: '2026-11-19T10:00:00Z',
          },
        ],
      }),
    );

    const queue = await gateway.getValidationQueue();

    expect(queue.ok && queue.value[0]?.kind === 'pose-proposal' && queue.value[0].pose.tags).toEqual([
      lunaire,
    ]);
    expect(queue.ok && (queue.value[1] as PendingPoseRevision).changes).toEqual([
      { field: 'tags', before: [], after: [lunaire] },
    ]);
  });

  it('should send the retained tags by identifier when they are adjusted', async () => {
    const requests: Request[] = [];
    const gateway = createValidationGateway(
      apiAnswering(
        200,
        { id: 'p-1', status: 'accepted', adjusted: true, ...pose, tags: [lunaire] },
        requests,
      ),
    );

    await gateway.acceptProposal(
      { kind: 'pose-proposal', id: 'p-1' },
      { adjustments: [{ field: 'tags', proposed: [lunaire, inversion], retained: [lunaire] }], note: null },
    );

    expect(await requests[0]!.json()).toEqual({ tagIds: ['tag-lunaire'] });
  });
});

describe('the tags of a revision', () => {
  it('should send the new tags by identifier only when they change', async () => {
    const requests: Request[] = [];
    const gateway = createPoseRevisionGateway(
      apiAnswering(
        201,
        { id: 'r-1', status: 'pending', poseId: 'pose-leaf', ...pose, tags: [lunaire] },
        requests,
      ),
    );
    const revision: ValidPoseRevision = {
      poseId: 'pose-leaf',
      poseVersion: 2,
      changes: [{ field: 'tags', before: [], after: [lunaire] }],
      message: null,
    };

    expect(await gateway.proposePoseRevision(revision)).toEqual(
      ok({ status: 'pending', name: 'Folded Leaf' }),
    );
    expect((await requests[0]!.json()).tagIds).toEqual(['tag-lunaire']);
  });
});

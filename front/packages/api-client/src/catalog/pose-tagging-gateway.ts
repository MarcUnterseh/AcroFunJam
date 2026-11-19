import { fail, ok, type PoseTaggingFailure, type PoseTaggingGateway, type Result } from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { tagIdsOf } from '../shared-kernel/tag-reading';

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  typeof problem === 'object' && problem !== null && 'title' in problem && typeof problem.title === 'string'
    ? problem.title
    : '';

const failureOf = (status: number, problem: unknown): PoseTaggingFailure => {
  // 401: visitor, expired session or deleted account (ADR 0018); 403: a role without « gérer les étiquettes ».
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status >= 500) return { kind: 'unreachable' };
  const code = codeOf(problem);
  if (status === 404 && code === 'catalog.pose-not-found') return { kind: 'not-found' };
  if (status === 409 && code === 'catalog.pose-revision-pending') return { kind: 'revision-pending' };
  if (status === 409 && code === 'catalog.tag-not-in-list')
    return { kind: 'tags-not-in-list', tagIds: tagIdsOf(problem) };
  if (status === 409 && code === 'catalog.tag-not-applicable')
    return { kind: 'tags-not-applicable', tagIds: tagIdsOf(problem) };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

/** HTTP adapter of the PoseTaggingGateway port of @acrofunjam/core (story 9a, ADR 0036). */
export const createPoseTaggingGateway = (client: ApiClient): PoseTaggingGateway => ({
  async tagPose(poseId, tagIds): Promise<Result<void, PoseTaggingFailure>> {
    try {
      const { error, response } = await client.PUT('/catalog/poses/{id}/tags', {
        params: { path: { id: poseId } },
        body: { tagIds: [...tagIds] },
      });
      // The page of the pose is read again to show the tags: the answer itself is not needed.
      return response.ok ? ok(undefined) : fail(failureOf(response.status, error));
    } catch {
      // A request that cannot reach the API (network down, server gone).
      return fail({ kind: 'unreachable' });
    }
  },
});

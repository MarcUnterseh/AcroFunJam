import {
  fail,
  ok,
  type Result,
  type TagTransitionFailure,
  type TransitionTaggingGateway,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { tagIdsOf } from '../shared-kernel/tag-reading';

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  typeof problem === 'object' && problem !== null && 'title' in problem && typeof problem.title === 'string'
    ? problem.title
    : '';

const failureOf = (status: number, problem: unknown): TagTransitionFailure => {
  // 401: visitor, expired session or deleted account (ADR 0018); 403: a role without « gérer les étiquettes ».
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status >= 500) return { kind: 'unreachable' };
  const code = codeOf(problem);
  if (status === 404 && code === 'catalog.transition-not-found') return { kind: 'not-found' };
  if (status === 409 && code === 'catalog.tag-not-in-list')
    return { kind: 'tags-not-in-list', tagIds: tagIdsOf(problem) };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

/** HTTP adapter of the TransitionTaggingGateway port of @acrofunjam/core (story 8, ADR 0034). */
export const createTransitionTaggingGateway = (client: ApiClient): TransitionTaggingGateway => ({
  async tagTransition(transitionId, tagIds): Promise<Result<void, TagTransitionFailure>> {
    try {
      const { error, response } = await client.PUT('/catalog/transitions/{id}/tags', {
        params: { path: { id: transitionId } },
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

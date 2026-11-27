import {
  fail,
  ok,
  type LinkedTransition,
  type PosePage,
  type PosePageFailure,
  type PosePageGateway,
  type PosePhoto,
  type Result,
  type TransitionTag,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';
import { everyItem, toTagReference } from '../shared-kernel/tag-reading';
import { toTransitionVideos } from './video-reading';

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isOptionalString = (value: unknown): value is string | null => value === null || isString(value);

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && isString(problem['title']) ? problem['title'] : '';

/** A tag of a transition of the page, with its description (story 8). */
const toTransitionTag = (value: unknown): TransitionTag | null => {
  const tag = toTagReference(value);
  return tag && isRecord(value) && isString(value['description'])
    ? { ...tag, description: value['description'] }
    : null;
};

/** A transition of the page, or null when it cannot be read (the server may evolve before the client). */
const toLinkedTransition = (value: unknown): LinkedTransition | null => {
  if (!isRecord(value)) return null;
  const { id, otherPose, name, baseDifficulty, flyerDifficulty, description } = value;
  const tags = everyItem(value['tags'], toTransitionTag);
  const videos = toTransitionVideos(value['videos']);
  if (
    !tags ||
    !videos ||
    !isString(id) ||
    !isRecord(otherPose) ||
    !isString(otherPose['id']) ||
    !isString(otherPose['name']) ||
    !isOptionalString(name) ||
    !isDifficultyCode(baseDifficulty) ||
    !isDifficultyCode(flyerDifficulty) ||
    !isOptionalString(description)
  )
    return null;
  return {
    id,
    otherPose: { id: otherPose['id'], name: otherPose['name'] },
    name,
    baseDifficulty,
    flyerDifficulty,
    description,
    tags,
    videos,
  };
};

/** A photo of a pose (story 10, ADR 0039), with or without alternative text, or null when it cannot be read. */
export const toPosePhoto = (value: unknown): PosePhoto | null => {
  if (!isRecord(value)) return null;
  const { id, altText, credit, width, height, sources } = value;
  if (
    !isString(id) ||
    !(altText === null || altText === undefined || isString(altText)) ||
    !isString(credit) ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !isRecord(sources) ||
    !isString(sources['thumbnail']) ||
    !isString(sources['page']) ||
    !isString(sources['enlarged'])
  )
    return null;
  return {
    id,
    altText: altText ?? null,
    credit,
    width,
    height,
    sources: { thumbnail: sources['thumbnail'], page: sources['page'], enlarged: sources['enlarged'] },
  };
};

const toTransitions = (value: unknown): LinkedTransition[] | null => {
  if (!Array.isArray(value)) return null;
  const transitions = value.map(toLinkedTransition);
  return transitions.every((transition) => transition !== null) ? transitions : null;
};

// HTTP DTOs never leak into core: they are mapped to the client domain here (the version of the pose, read by the
// revision of a pose, is not part of its page).
const toPosePage = (value: unknown): PosePage | null => {
  if (!isRecord(value)) return null;
  const { id, name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = value;
  const transitionsFrom = toTransitions(value['transitionsFrom']);
  const transitionsTo = toTransitions(value['transitionsTo']);
  const tags = everyItem(value['tags'], toTransitionTag);
  const { pendingRevision } = value;
  const photos = everyItem(value['photos'], toPosePhoto);
  if (
    !isString(id) ||
    !isString(name) ||
    !isDifficultyCode(baseDifficulty) ||
    !isDifficultyCode(flyerDifficulty) ||
    !isBoolean(canStartFlow) ||
    !isBoolean(canEndFlow) ||
    !transitionsFrom ||
    !transitionsTo ||
    !tags ||
    !isBoolean(pendingRevision) ||
    !photos
  )
    return null;
  return {
    id,
    name,
    baseDifficulty,
    flyerDifficulty,
    canStartFlow,
    canEndFlow,
    transitionsFrom,
    transitionsTo,
    tags,
    pendingRevision,
    photos,
  };
};

const failureOf = (status: number, problem: unknown): PosePageFailure => {
  if (status === 404 && codeOf(problem) === 'catalog.pose-not-found') return { kind: 'not-found' };
  if (status >= 500) return { kind: 'unreachable' };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

/** HTTP adapter of the PosePageGateway port of @acrofunjam/core (story 7, ADR 0030). */
export const createPosePageGateway = (client: ApiClient): PosePageGateway => ({
  async getPosePage(poseId): Promise<Result<PosePage, PosePageFailure>> {
    try {
      const { data, error, response } = await client.GET('/catalog/poses/{id}', {
        params: { path: { id: poseId } },
      });
      if (!response.ok) return fail(failureOf(response.status, error));
      const page = toPosePage(data);
      return page ? ok(page) : fail({ kind: 'outdated' });
    } catch {
      // A request that cannot reach the API (network down, server gone).
      return fail({ kind: 'unreachable' });
    }
  },
});

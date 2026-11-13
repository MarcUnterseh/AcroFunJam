import {
  fail,
  ok,
  type PoseName,
  type PoseRevisionGateway,
  type PoseValueChange,
  type ProposalOutcome,
  type Result,
  type RevisablePose,
  type RevisionFailure,
  type RevisionOpeningFailure,
  type ValidPoseRevision,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';

type ProposePoseRevisionRequest = components['schemas']['ProposePoseRevisionRequest'];

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && typeof problem['title'] === 'string' ? problem['title'] : '';

// 401: visitor, expired session or deleted account (ADR 0018); 403 (a role without "propose", none today) is
// handled the same way, as for proposePose. A refusal the site does not know: it must be reloaded.
const commonFailure = (status: number): RevisionOpeningFailure => {
  if (status === 401 || status === 403) return { kind: 'unauthenticated' };
  if (status >= 500) return { kind: 'unreachable' };
  return { kind: 'outdated' };
};

/**
 * The published pose as Contribution reads it (anti-corruption layer over GET /catalog/poses/{id}); null when it
 * cannot be read: the generated types describe the contract, but the server may evolve before the client.
 */
const toRevisablePose = (pose: unknown): RevisablePose | null => {
  if (!isRecord(pose)) return null;
  const { id, name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = pose;
  // An int32, possibly written as a string by the contract; a version starts at 1 (ADR 0024).
  const raw = pose['version'];
  const version =
    typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw)) ? Number(raw) : NaN;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    !isDifficultyCode(baseDifficulty) ||
    !isDifficultyCode(flyerDifficulty) ||
    !isBoolean(canStartFlow) ||
    !isBoolean(canEndFlow) ||
    !Number.isInteger(version) ||
    version < 1
  )
    return null;
  // The catalog returns the normalised name of a published pose.
  return { id, name: name as PoseName, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow, version };
};

const refusals: Readonly<Record<string, RevisionFailure>> = {
  'contribution.pose-name-already-in-catalog': { kind: 'name-already-in-catalog' },
  'contribution.pose-name-already-pending': { kind: 'name-already-pending' },
  'contribution.pose-changed-since-revision-started': { kind: 'pose-changed' },
  'contribution.pose-revision-already-pending': { kind: 'revision-already-pending' },
  'contribution.pose-not-found': { kind: 'not-found' },
  'contribution.revision-changes-nothing': { kind: 'changes-nothing' },
};

// The content rules (400 pose.*, the message) are checked by the site before sending: refused anyway, the site is
// outdated, as for a refusal it does not know; the input is kept and reloading brings the new rules (ADR 0019).
const revisionFailure = (status: number, problem: unknown): RevisionFailure =>
  ([404, 409, 422].includes(status) ? refusals[codeOf(problem)] : undefined) ?? commonFailure(status);

// The request is written field by field: the contract is the generated schema, not the client domain. A null field
// keeps the value of the pose: only the changed fields carry a value (Q29), the message only when there is one.
const toRequest = ({
  poseId,
  poseVersion,
  changes,
  message,
}: ValidPoseRevision): ProposePoseRevisionRequest => {
  const after = <F extends PoseValueChange['field']>(field: F) =>
    (changes.find((change) => change.field === field)?.after ?? null) as
      Extract<PoseValueChange, { field: F }>['after'] | null;
  return {
    poseId,
    poseVersion,
    name: after('name'),
    baseDifficulty: after('baseDifficulty'),
    flyerDifficulty: after('flyerDifficulty'),
    canStartFlow: after('canStartFlow'),
    canEndFlow: after('canEndFlow'),
    message,
  };
};

const statuses: Readonly<Record<string, ProposalOutcome['status']>> = {
  pending: 'pending',
  accepted: 'published',
};

/** A request that cannot reach the API (network down, server gone) is reported as such, whatever the call. */
const unlessUnreachable = async <T, E>(
  call: () => Promise<Result<T, E>>,
): Promise<Result<T, E | { readonly kind: 'unreachable' }>> => {
  try {
    return await call();
  } catch {
    return fail({ kind: 'unreachable' });
  }
};

/** HTTP adapter of the PoseRevisionGateway port of @acrofunjam/core (story 6). */
export const createPoseRevisionGateway = (client: ApiClient): PoseRevisionGateway => ({
  getRevisablePose: (poseId) =>
    unlessUnreachable(async () => {
      const { data, error, response } = await client.GET('/catalog/poses/{id}', {
        params: { path: { id: poseId } },
      });
      if (!response.ok) {
        if (response.status === 404 && codeOf(error) === 'catalog.pose-not-found')
          return fail({ kind: 'not-found' });
        return fail(commonFailure(response.status));
      }
      const pose = toRevisablePose(data);
      return pose ? ok(pose) : fail({ kind: 'outdated' });
    }),

  getPendingRevision: (poseId) =>
    unlessUnreachable(async () => {
      const { data, response } = await client.GET('/contribution/pose-revision-proposals/pending', {
        params: { query: { poseId } },
      });
      if (!response.ok || !data) return fail(commonFailure(response.status));
      const pending: unknown = data.pendingRevision;
      if (pending === null) return ok(null);
      return isRecord(pending) && isBoolean(pending['isYours'])
        ? ok({ isYours: pending['isYours'] })
        : fail({ kind: 'outdated' });
    }),

  proposePoseRevision: (revision) =>
    unlessUnreachable(async () => {
      const { data, error, response } = await client.POST('/contribution/pose-revision-proposals', {
        body: toRequest(revision),
      });
      if (!response.ok) return fail(revisionFailure(response.status, error));
      // Received: a status the site cannot read (a newer API) only means "received", nothing is promised.
      const answer: { status?: unknown; name?: unknown } = data ?? {};
      const name = revision.changes.find((change) => change.field === 'name')?.after;
      return ok({
        status: (typeof answer.status === 'string' && statuses[answer.status]) || 'received',
        name: typeof answer.name === 'string' ? answer.name : (name ?? ''),
      });
    }),
});

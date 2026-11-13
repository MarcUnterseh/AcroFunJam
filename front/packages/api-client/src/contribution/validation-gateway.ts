import {
  fail,
  ok,
  type Acceptance,
  type AccessFailure,
  type DecisionFailure,
  type PendingProposal,
  type PoseAdjustment,
  type PoseContent,
  type PoseName,
  type PoseValueChange,
  type ProposalReference,
  type Result,
  type RevisionMessage,
  type ValidationGateway,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';

type AcceptPoseProposalRequest = components['schemas']['AcceptPoseProposalRequest'];

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isDate = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value));

/** The values of a pose, or null when they cannot be read. */
const poseOf = (value: Record<string, unknown>): PoseContent | null => {
  const { name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = value;
  if (
    !isString(name) ||
    !isDifficultyCode(baseDifficulty) ||
    !isDifficultyCode(flyerDifficulty) ||
    !isBoolean(canStartFlow) ||
    !isBoolean(canEndFlow)
  )
    return null;
  // The API returns normalised names.
  return { name: name as PoseName, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow };
};

const contributorOf = (value: unknown) =>
  isRecord(value) && (value['email'] === null || isString(value['email'])) && isBoolean(value['isYou'])
    ? { email: value['email'] as string | null, isYou: value['isYou'] }
    : null;

const checks = {
  name: isString,
  baseDifficulty: isDifficultyCode,
  flyerDifficulty: isDifficultyCode,
  canStartFlow: isBoolean,
  canEndFlow: isBoolean,
} as const;

/** The changed fields, in the order of the form: current → proposed; null when they cannot be read or none. */
const changesOf = (value: unknown): PoseValueChange[] | null => {
  if (!isRecord(value)) return null;
  const changes: PoseValueChange[] = [];
  for (const [field, isValue] of Object.entries(checks) as [keyof typeof checks, (v: unknown) => boolean][]) {
    const change = value[field];
    if (change === null) continue;
    if (!isRecord(change) || !isValue(change['current']) || !isValue(change['proposed'])) return null;
    changes.push({ field, before: change['current'], after: change['proposed'] } as PoseValueChange);
  }
  return changes.length > 0 ? changes : null;
};

// The generated types describe the contract, but the server may evolve before the client is regenerated: an item
// the site cannot read (unknown kind, unknown code, missing value) makes the whole queue unreadable (ADR 0027).
// HTTP DTOs never leak into core: they are mapped to the client domain here.
const toPendingProposal = (item: unknown): PendingProposal | null => {
  if (!isRecord(item) || !isString(item['id']) || !isDate(item['submittedAt'])) return null;
  const contributor = contributorOf(item['contributor']);
  if (!contributor) return null;
  const common = { id: item['id'], contributor, submittedAt: new Date(item['submittedAt']) };
  switch (item['kind']) {
    case 'pose-proposal': {
      const pose = poseOf(item);
      return pose && { kind: 'pose-proposal', ...common, pose };
    }
    case 'pose-revision': {
      const published = item['pose'];
      const pose = isRecord(published) && isString(published['id']) ? poseOf(published) : null;
      const changes = changesOf(item['changes']);
      const message = item['message'];
      if (!pose || !changes || (message !== null && !isString(message))) return null;
      return {
        kind: 'pose-revision',
        ...common,
        pose: { id: (published as { id: string }).id, ...pose },
        changes,
        message: message as RevisionMessage | null,
      };
    }
    default:
      return null;
  }
};

const accessFailure = (status: number): AccessFailure => {
  // 401: visitor, expired session or deleted account (ADR 0018). 403: the role was withdrawn (Q16).
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403) return { kind: 'forbidden' };
  if (status >= 500) return { kind: 'unreachable' };
  // A refusal the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

/** The retained value of an adjusted field, as the contract names it. */
const toField = (adjustment: PoseAdjustment): AcceptPoseProposalRequest => {
  switch (adjustment.field) {
    case 'name':
      return { name: adjustment.retained };
    case 'baseDifficulty':
      return { baseDifficulty: adjustment.retained };
    case 'flyerDifficulty':
      return { flyerDifficulty: adjustment.retained };
    case 'canStartFlow':
      return { canStartFlow: adjustment.retained };
    case 'canEndFlow':
      return { canEndFlow: adjustment.retained };
  }
};

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  typeof problem === 'object' && problem !== null && 'title' in problem && typeof problem.title === 'string'
    ? problem.title
    : '';

/** Refusals of a decision on this proposal (ProblemResults of the API, ADR 0022), by business code. */
const decisionRefusals: Readonly<Record<string, DecisionFailure>> = {
  'contribution.proposal-already-decided': { kind: 'already-decided' },
  'contribution.proposal-not-found': { kind: 'not-found' },
  // Story 6: the pose of a revision left the catalog meanwhile; the revision can no longer be decided.
  'contribution.pose-not-found': { kind: 'not-found' },
  'contribution.pose-name-already-in-catalog': { kind: 'name-already-in-catalog' },
  // The catalog checks the name again when publishing (R12): a pose of this name was published meanwhile.
  'catalog.pose-name-taken': { kind: 'name-already-in-catalog' },
  'contribution.pose-name-already-pending': { kind: 'name-already-pending' },
  // Story 6: the retained revision would leave the pose as it is; the pose changed since it was proposed.
  'contribution.retained-revision-changes-nothing': { kind: 'retained-revision-changes-nothing' },
  'contribution.pose-changed-since-revision-started': { kind: 'pose-changed' },
};

// 401 and 403 whatever the code (session, deleted account, role withdrawn). The content rules (400 pose.*, the
// note) are checked by the site before sending: refused anyway, the site is outdated, as for an unknown code.
const decisionFailure = (status: number, problem: unknown): DecisionFailure =>
  (status === 404 || status === 409 || status === 422 ? decisionRefusals[codeOf(problem)] : undefined) ??
  accessFailure(status);

// The request is written field by field: the contract is the generated schema, not the client domain. An absent
// field keeps the proposed value (ADR 0022): only the adjusted fields are sent, and the message only with them.
const toRequest = ({ adjustments, note }: Acceptance): AcceptPoseProposalRequest =>
  adjustments.reduce<AcceptPoseProposalRequest>(
    (request, adjustment) => ({ ...request, ...toField(adjustment) }),
    note === null ? {} : { message: note },
  );

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

/** Each kind of proposal is decided at its own address, with the same body and answer (ADR 0027). */
const acceptancePath = ({ kind }: ProposalReference) =>
  kind === 'pose-revision'
    ? '/contribution/pose-revision-proposals/{id}/acceptance'
    : '/contribution/pose-proposals/{id}/acceptance';

const rejectionPath = ({ kind }: ProposalReference) =>
  kind === 'pose-revision'
    ? '/contribution/pose-revision-proposals/{id}/rejection'
    : '/contribution/pose-proposals/{id}/rejection';

/** HTTP adapter of the ValidationGateway port of @acrofunjam/core (story 4). */
export const createValidationGateway = (client: ApiClient): ValidationGateway => ({
  getValidationQueue: () =>
    unlessUnreachable(async () => {
      const { data, response } = await client.GET('/contribution/validation-queue');
      if (!response.ok || !data) return fail(accessFailure(response.status));
      const items: unknown = data.proposals;
      if (!Array.isArray(items)) return fail({ kind: 'outdated' });
      const queue = items.map(toPendingProposal);
      return queue.every((item) => item !== null) ? ok(queue) : fail({ kind: 'outdated' });
    }),

  countPendingProposals: () =>
    unlessUnreachable(async () => {
      const { data, response } = await client.GET('/contribution/validation-queue/count');
      if (!response.ok || !data) return fail(accessFailure(response.status));
      // The contract allows an int32 written as a string.
      const count = Number(data.count);
      return Number.isInteger(count) && count >= 0 ? ok(count) : fail({ kind: 'outdated' });
    }),

  acceptProposal: (proposal, acceptance) =>
    unlessUnreachable(async () => {
      const { data, error, response } = await client.POST(acceptancePath(proposal), {
        params: { path: { id: proposal.id } },
        body: toRequest(acceptance),
      });
      if (!response.ok || !data) return fail(decisionFailure(response.status, error));
      return ok({ name: data.name, adjusted: data.adjusted });
    }),

  rejectProposal: (proposal, reason) =>
    unlessUnreachable(async () => {
      const { error, response } = await client.POST(rejectionPath(proposal), {
        params: { path: { id: proposal.id } },
        body: { reason },
      });
      return response.ok ? ok(undefined) : fail(decisionFailure(response.status, error));
    }),
});

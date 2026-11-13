import {
  fail,
  ok,
  type ContributionGateway,
  type MyProposal,
  type MyProposalsFailure,
  type MyProposalStatus,
  type AdjustmentNote,
  type PoseAdjustment,
  type RejectionReason,
  type PoseName,
  type PoseValueChange,
  type ProposalFailure,
  type ProposalOutcome,
  type Result,
  type ValidPoseProposal,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';
import { toTransitionAdjustments, toTransitionContent, toTransitionPose } from './transition-reading';

type ProposePoseRequest = components['schemas']['ProposePoseRequest'];
type MyPoseProposalResponse = components['schemas']['MyProposalResponseMyPoseProposalResponse'];
type MyPoseRevisionResponse = components['schemas']['MyProposalResponseMyPoseRevisionResponse'];
type MyTransitionProposalResponse = components['schemas']['MyProposalResponseMyTransitionProposalResponse'];
type PoseAdjustmentsResponse = components['schemas']['PoseAdjustmentsResponse'];

const nameRefusals: Readonly<Record<string, ProposalFailure>> = {
  'contribution.pose-name-already-in-catalog': { kind: 'name-already-in-catalog' },
  'contribution.pose-name-already-pending': { kind: 'name-already-pending' },
};

const statuses: Readonly<Record<string, ProposalOutcome['status']>> = {
  pending: 'pending',
  accepted: 'published',
};

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  typeof problem === 'object' && problem !== null && 'title' in problem && typeof problem.title === 'string'
    ? problem.title
    : '';

const toFailure = (status: number, problem: unknown): ProposalFailure => {
  // 401: visitor, expired session or deleted account (ADR 0018).
  // TODO: 403 "identity.capability-required" (a role without "propose") is handled as an expired session for
  // now: no role lacks this capability today. When one does, it deserves its own failure and message
  // (« Ton compte ne permet pas de proposer de pose. », ADR 0019).
  if (status === 401 || status === 403) return { kind: 'unauthenticated' };
  if (status >= 500) return { kind: 'unreachable' };
  const refusal = status === 409 ? nameRefusals[codeOf(problem)] : undefined;
  if (refusal) return refusal;
  // The content rules (400 pose.*) are checked by the site before sending: refused anyway, the site is outdated,
  // as for a refusal it does not know; the input is kept and reloading brings the new rules (ADR 0019).
  return { kind: 'outdated' };
};

// The request is written field by field: the contract is the generated schema, not the client domain.
const toRequest = (proposal: ValidPoseProposal): ProposePoseRequest => ({
  name: proposal.name,
  baseDifficulty: proposal.baseDifficulty,
  flyerDifficulty: proposal.flyerDifficulty,
  canStartFlow: proposal.canStartFlow,
  canEndFlow: proposal.canEndFlow,
});

// 401: visitor, expired session or deleted account (ADR 0018); 403 (a role without "propose", none today) is
// handled the same way, as for proposePose.
const myProposalsFailure = (status: number): MyProposalsFailure => {
  if (status === 401 || status === 403) return { kind: 'unauthenticated' };
  if (status >= 500) return { kind: 'unreachable' };
  // An answer the site does not know: the API is newer than the site, which must be reloaded.
  return { kind: 'outdated' };
};

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));

// The generated types describe the contract, but the server may evolve before the client is regenerated.
const isReadablePose = (proposal: MyPoseProposalResponse): boolean =>
  typeof proposal.id === 'string' &&
  typeof proposal.name === 'string' &&
  isDifficultyCode(proposal.baseDifficulty) &&
  isDifficultyCode(proposal.flyerDifficulty) &&
  typeof proposal.canStartFlow === 'boolean' &&
  typeof proposal.canEndFlow === 'boolean' &&
  isDate(proposal.submittedAt);

type Change<T> = { readonly proposed: T; readonly retained: T } | null;

/** An adjusted field, null when absent (not adjusted), undefined when it cannot be read. */
const change = <T>(value: unknown, isValue: (v: unknown) => v is T): Change<T> | undefined => {
  if (value === null) return null;
  if (typeof value !== 'object' || value === undefined) return undefined;
  const { proposed, retained } = value as { proposed?: unknown; retained?: unknown };
  return isValue(proposed) && isValue(retained) ? { proposed, retained } : undefined;
};

const isString = (v: unknown): v is string => typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

/** The adjusted fields, in the order of the form; undefined when they cannot be read (none, or unreadable). */
const toAdjustments = (value: unknown): PoseAdjustment[] | undefined => {
  if (value === null || typeof value !== 'object') return undefined;
  const adjustments = value as PoseAdjustmentsResponse;
  const name = change(adjustments.name, isString);
  const base = change(adjustments.baseDifficulty, isDifficultyCode);
  const flyer = change(adjustments.flyerDifficulty, isDifficultyCode);
  const start = change(adjustments.canStartFlow, isBoolean);
  const end = change(adjustments.canEndFlow, isBoolean);
  if ([name, base, flyer, start, end].includes(undefined)) return undefined;
  const read: PoseAdjustment[] = [];
  if (name)
    read.push({ field: 'name', proposed: name.proposed as PoseName, retained: name.retained as PoseName });
  if (base) read.push({ field: 'baseDifficulty', ...base });
  if (flyer) read.push({ field: 'flyerDifficulty', ...flyer });
  if (start) read.push({ field: 'canStartFlow', ...start });
  if (end) read.push({ field: 'canEndFlow', ...end });
  return read.length > 0 ? read : undefined;
};

const valueChecks = {
  name: isString,
  baseDifficulty: isDifficultyCode,
  flyerDifficulty: isDifficultyCode,
  canStartFlow: isBoolean,
  canEndFlow: isBoolean,
} as const;

/** What changes in the pose, before → after, the changed fields only; undefined when it cannot be read or is empty. */
const toChanges = (changes: unknown): PoseValueChange[] | undefined => {
  if (typeof changes !== 'object' || changes === null) return undefined;
  const read: PoseValueChange[] = [];
  for (const [field, isValue] of Object.entries(valueChecks) as [
    keyof typeof valueChecks,
    (v: unknown) => boolean,
  ][]) {
    const change: unknown = (changes as Record<string, unknown>)[field];
    if (change === null) continue;
    if (typeof change !== 'object' || change === undefined) return undefined;
    const { before, after } = change as { before?: unknown; after?: unknown };
    if (!isValue(before) || !isValue(after)) return undefined;
    read.push({ field, before, after } as PoseValueChange);
  }
  return read.length > 0 ? read : undefined;
};

type ItemOfMyProposals = { readonly kind?: unknown } & Record<string, unknown>;

/**
 * An item of « Mes propositions » (ADR 0027), or undefined when the site cannot read it (unknown kind, unreadable
 * pose or changes): the whole list would mislead, the site must be reloaded. An unreadable status only makes the
 * card say its status cannot be read.
 */
const toMyProposal = (item: ItemOfMyProposals): MyProposal | undefined => {
  switch (item.kind) {
    case 'pose-proposal': {
      const proposal = item as unknown as MyPoseProposalResponse;
      return isReadablePose(proposal) ? toMyPoseProposal(proposal) : undefined;
    }
    case 'pose-revision': {
      const revision = item as unknown as MyPoseRevisionResponse;
      const changes = toChanges(revision.changes);
      if (
        typeof revision.id !== 'string' ||
        !isString(revision.poseName) ||
        !isDate(revision.submittedAt) ||
        !changes
      )
        return undefined;
      return {
        kind: 'pose-revision',
        id: revision.id,
        // The API returns the normalised name of the pose when proposed.
        poseName: revision.poseName as PoseName,
        submittedAt: new Date(revision.submittedAt),
        status: toStatus(revision, toAdjustments),
        changes,
      };
    }
    case 'transition-proposal': {
      // Story 7: its poses under their current names, the transition retained once accepted, proposed otherwise.
      const transition = item as unknown as MyTransitionProposalResponse;
      const fromPose = toTransitionPose(transition.fromPose);
      const toPose = toTransitionPose(transition.toPose);
      const content = toTransitionContent(item);
      if (
        typeof transition.id !== 'string' ||
        !fromPose ||
        !toPose ||
        !content ||
        !isDate(transition.submittedAt)
      )
        return undefined;
      return {
        kind: 'transition-proposal',
        id: transition.id,
        fromPose,
        toPose,
        transition: content,
        submittedAt: new Date(transition.submittedAt),
        status: toStatus(transition, toTransitionAdjustments),
      };
    }
    default:
      return undefined;
  }
};

type DecidedItem = Pick<MyPoseProposalResponse, 'status' | 'decidedAt' | 'message' | 'reason'> & {
  readonly adjustments: unknown;
};

/**
 * The status for the contributor, its adjustments read as those of its kind of proposal; "unknown" when it cannot be
 * read (unknown code, or a known one without its details).
 */
const toStatus = <A>(
  proposal: DecidedItem,
  adjustmentsOf: (adjustments: unknown) => A[] | undefined,
): MyProposalStatus<A> => {
  const unknownStatus: MyProposalStatus<A> = { kind: 'unknown' };
  const status: string = proposal.status;
  if (status === 'pending') return { kind: 'pending' };
  if (status === 'published-directly') return { kind: 'published-directly' };
  if (!isDate(proposal.decidedAt)) return unknownStatus;
  const decidedAt = new Date(proposal.decidedAt);
  switch (status) {
    case 'accepted':
      return { kind: 'accepted', decidedAt };
    case 'accepted-with-adjustments': {
      const adjustments = adjustmentsOf(proposal.adjustments);
      if (!adjustments || (proposal.message !== null && !isString(proposal.message))) return unknownStatus;
      return {
        kind: 'accepted-with-adjustments',
        decidedAt,
        adjustments,
        message: proposal.message as AdjustmentNote | null,
      };
    }
    case 'rejected':
      return isString(proposal.reason)
        ? { kind: 'rejected', decidedAt, reason: proposal.reason as RejectionReason }
        : unknownStatus;
    default:
      return unknownStatus;
  }
};

const toMyPoseProposal = (proposal: MyPoseProposalResponse): MyProposal => ({
  kind: 'pose-proposal',
  id: proposal.id,
  pose: {
    name: proposal.name as PoseName,
    baseDifficulty: proposal.baseDifficulty,
    flyerDifficulty: proposal.flyerDifficulty,
    canStartFlow: proposal.canStartFlow,
    canEndFlow: proposal.canEndFlow,
  },
  submittedAt: new Date(proposal.submittedAt),
  status: toStatus(proposal, toAdjustments),
});

/** HTTP adapter of the ContributionGateway port of @acrofunjam/core. */
export const createContributionGateway = (client: ApiClient): ContributionGateway => ({
  async proposePose(proposal): Promise<Result<ProposalOutcome, ProposalFailure>> {
    try {
      const { data, error, response } = await client.POST('/contribution/pose-proposals', {
        body: toRequest(proposal),
      });
      if (!response.ok) return fail(toFailure(response.status, error));
      // Received: a status the site cannot read (a newer API) only means "received", nothing is promised.
      const answer: { status?: unknown; name?: unknown } = data ?? {};
      return ok({
        status: (typeof answer.status === 'string' && statuses[answer.status]) || 'received',
        name: typeof answer.name === 'string' ? answer.name : proposal.name,
      });
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },

  async getMyProposals(): Promise<Result<readonly MyProposal[], MyProposalsFailure>> {
    try {
      const { data, response } = await client.GET('/contribution/my-proposals');
      if (!response.ok || !data) return fail(myProposalsFailure(response.status));
      // An item that cannot be read: the whole list would mislead, the site must be reloaded.
      const items: unknown = data.proposals;
      if (!Array.isArray(items)) return fail({ kind: 'outdated' });
      const proposals = items.map((item) =>
        typeof item === 'object' && item !== null ? toMyProposal(item as ItemOfMyProposals) : undefined,
      );
      return proposals.every((proposal) => proposal !== undefined)
        ? ok(proposals)
        : fail({ kind: 'outdated' });
    } catch {
      return fail({ kind: 'unreachable' });
    }
  },
});

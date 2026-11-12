import {
  fail,
  ok,
  type Acceptance,
  type AccessFailure,
  type DecisionFailure,
  type PendingProposal,
  type PoseAdjustment,
  type PoseName,
  type Result,
  type ValidationGateway,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isDifficultyCode } from '../shared-kernel/difficulty-codes';

type PendingPoseProposalResponse = components['schemas']['PendingPoseProposalResponse'];
type AcceptPoseProposalRequest = components['schemas']['AcceptPoseProposalRequest'];

// The generated types describe the contract, but the server may evolve before the client is regenerated.
const isReadable = (proposal: PendingPoseProposalResponse): boolean =>
  isDifficultyCode(proposal.baseDifficulty) &&
  isDifficultyCode(proposal.flyerDifficulty) &&
  typeof proposal.canStartFlow === 'boolean' &&
  typeof proposal.canEndFlow === 'boolean' &&
  !Number.isNaN(Date.parse(proposal.submittedAt));

// HTTP DTOs never leak into core: they are mapped to the client domain here.
const toPendingProposal = (proposal: PendingPoseProposalResponse): PendingProposal => ({
  id: proposal.id,
  pose: {
    // The API returns the normalised name of a received proposal.
    name: proposal.name as PoseName,
    baseDifficulty: proposal.baseDifficulty,
    flyerDifficulty: proposal.flyerDifficulty,
    canStartFlow: proposal.canStartFlow,
    canEndFlow: proposal.canEndFlow,
  },
  contributor: { email: proposal.contributor.email, isYou: proposal.contributor.isYou },
  submittedAt: new Date(proposal.submittedAt),
});

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
  'contribution.pose-name-already-in-catalog': { kind: 'name-already-in-catalog' },
  // The catalog checks the name again when publishing (R12): a pose of this name was published meanwhile.
  'catalog.pose-name-taken': { kind: 'name-already-in-catalog' },
  'contribution.pose-name-already-pending': { kind: 'name-already-pending' },
};

// 401 and 403 whatever the code (session, deleted account, role withdrawn). The content rules (400 pose.*, the
// note) are checked by the site before sending: refused anyway, the site is outdated, as for an unknown code.
const decisionFailure = (status: number, problem: unknown): DecisionFailure =>
  (status === 404 || status === 409 ? decisionRefusals[codeOf(problem)] : undefined) ?? accessFailure(status);

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

/** HTTP adapter of the ValidationGateway port of @acrofunjam/core (story 4). */
export const createValidationGateway = (client: ApiClient): ValidationGateway => ({
  getValidationQueue: () =>
    unlessUnreachable(async () => {
      const { data, response } = await client.GET('/contribution/validation-queue');
      if (!response.ok || !data) return fail(accessFailure(response.status));
      if (!data.proposals.every(isReadable)) return fail({ kind: 'outdated' });
      return ok(data.proposals.map(toPendingProposal));
    }),

  countPendingProposals: () =>
    unlessUnreachable(async () => {
      const { data, response } = await client.GET('/contribution/validation-queue/count');
      if (!response.ok || !data) return fail(accessFailure(response.status));
      // The contract allows an int32 written as a string.
      const count = Number(data.count);
      return Number.isInteger(count) && count >= 0 ? ok(count) : fail({ kind: 'outdated' });
    }),

  acceptProposal: (id, acceptance) =>
    unlessUnreachable(async () => {
      const { data, error, response } = await client.POST('/contribution/pose-proposals/{id}/acceptance', {
        params: { path: { id } },
        body: toRequest(acceptance),
      });
      if (!response.ok || !data) return fail(decisionFailure(response.status, error));
      return ok({ name: data.name, adjusted: data.adjusted });
    }),

  rejectProposal: (id, reason) =>
    unlessUnreachable(async () => {
      const { error, response } = await client.POST('/contribution/pose-proposals/{id}/rejection', {
        params: { path: { id } },
        body: { reason },
      });
      return response.ok ? ok(undefined) : fail(decisionFailure(response.status, error));
    }),
});

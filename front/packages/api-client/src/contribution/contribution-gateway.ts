import {
  fail,
  ok,
  type ContributionGateway,
  type ProposalFailure,
  type ProposalOutcome,
  type Result,
  type ValidPoseProposal,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';

type ProposePoseRequest = components['schemas']['ProposePoseRequest'];

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
});

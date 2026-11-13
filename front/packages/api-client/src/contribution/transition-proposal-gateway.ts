import {
  fail,
  ok,
  type Result,
  type TransitionPose,
  type TransitionPosesFailure,
  type TransitionProposalFailure,
  type TransitionProposalGateway,
  type TransitionProposalOutcome,
  type ValidTransitionProposal,
} from '@acrofunjam/core';
import type { ApiClient } from '../client';
import type { components } from '../generated/schema';
import { isRecord, toTransitionPose, transitionPlaceRefusals } from './transition-reading';

type ProposeTransitionRequest = components['schemas']['ProposeTransitionRequest'];

/** The business code of a ProblemDetails is its title (ADR 0007). */
const codeOf = (problem: unknown): string =>
  isRecord(problem) && typeof problem['title'] === 'string' ? problem['title'] : '';

const refusals: Readonly<Record<string, TransitionProposalFailure>> = {
  ...transitionPlaceRefusals,
  'contribution.from-pose-not-found': { kind: 'from-pose-not-found' },
  'contribution.to-pose-not-found': { kind: 'to-pose-not-found' },
};

const failureOf = (status: number, problem: unknown): TransitionProposalFailure => {
  // 401: visitor, expired session or deleted account (ADR 0018); 403 (a role without "propose", none today) is
  // handled the same way, as for the other proposals.
  if (status === 401 || status === 403) return { kind: 'unauthenticated' };
  if (status >= 500) return { kind: 'unreachable' };
  const refusal = status === 404 || status === 409 ? refusals[codeOf(problem)] : undefined;
  // The content rules (400) are checked by the site before sending: refused anyway, the site is outdated, as for a
  // refusal it does not know; the input is kept and reloading brings the new rules (ADR 0019).
  return refusal ?? { kind: 'outdated' };
};

// The request is written field by field: the contract is the generated schema, not the client domain.
const toRequest = (transition: ValidTransitionProposal): ProposeTransitionRequest => ({
  fromPoseId: transition.fromPoseId,
  toPoseId: transition.toPoseId,
  name: transition.name,
  baseDifficulty: transition.baseDifficulty,
  flyerDifficulty: transition.flyerDifficulty,
  description: transition.description,
});

const statuses: Readonly<Record<string, TransitionProposalOutcome['status']>> = {
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

/** HTTP adapter of the TransitionProposalGateway port of @acrofunjam/core (story 7, ADR 0030). */
export const createTransitionProposalGateway = (client: ApiClient): TransitionProposalGateway => ({
  listPublishedPoses: () =>
    unlessUnreachable<readonly TransitionPose[], TransitionPosesFailure>(async () => {
      const { data, response } = await client.GET('/catalog/poses');
      if (!response.ok || !data)
        return fail(response.status >= 500 ? { kind: 'unreachable' } : { kind: 'outdated' });
      const poses: unknown = data.poses;
      if (!Array.isArray(poses)) return fail({ kind: 'outdated' });
      const read = poses.map(toTransitionPose);
      return read.every((pose) => pose !== null) ? ok(read) : fail({ kind: 'outdated' });
    }),

  proposeTransition: (transition) =>
    unlessUnreachable<TransitionProposalOutcome, TransitionProposalFailure>(async () => {
      const { data, error, response } = await client.POST('/contribution/transition-proposals', {
        body: toRequest(transition),
      });
      if (!response.ok) return fail(failureOf(response.status, error));
      // Received: a status the site cannot read (a newer API) only means "received", nothing is promised.
      const answer: Record<string, unknown> = isRecord(data) ? data : {};
      const fromPose = toTransitionPose(answer['fromPose']);
      const toPose = toTransitionPose(answer['toPose']);
      const name = answer['name'];
      // Poses it cannot read: the confirmation could not name them, it only says « received » (generic message).
      const status = (typeof answer['status'] === 'string' && statuses[answer['status']]) || 'received';
      return ok({
        status: fromPose && toPose ? status : 'received',
        fromPose: fromPose ?? { id: transition.fromPoseId, name: '' },
        toPose: toPose ?? { id: transition.toPoseId, name: '' },
        name: typeof name === 'string' ? name : name === null ? null : transition.name,
      });
    }),
});

import { fail, type Result } from '../../domain/common/result';
import type { MyProposal } from '../../domain/contribution/my-pose-proposal';
import type { ContributionGateway } from './ContributionGateway';

// Story 5 « Suivre mes propositions »: the proposals of the requester and what became of them.

/** Why the site cannot show the proposals of the requester: what it tells them. */
export type MyProposalsError =
  /** Visitor, expired session or deleted account: sign in again (ADR 0018). */
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'unreachable' }
  /** An answer the site cannot read: it must be reloaded. */
  | { readonly kind: 'outdated' };

/** The proposals of the requester, the most recently submitted first (the order is guaranteed by the API). */
export const getMyProposals = async (
  gateway: ContributionGateway,
): Promise<Result<readonly MyProposal[], MyProposalsError>> => {
  const answer = await gateway.getMyProposals();
  if (answer.ok) return answer;
  return fail(answer.error.kind === 'unauthenticated' ? { kind: 'session-expired' } : answer.error);
};

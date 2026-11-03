import { fail, ok, type Result } from '../../domain/common/result';
import {
  validatePoseProposal,
  type PoseProposalInput,
  type ProposalFieldError,
} from '../../domain/contribution/pose-proposal';
import type { ContributionGateway, ProposalOutcome } from './ContributionGateway';
import type { ProposalInputStore } from './ProposalInputStorePort';

export type ProposePoseError =
  | { readonly kind: 'invalid-input'; readonly errors: readonly ProposalFieldError[] }
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

/**
 * Checks the input locally (no request if invalid), then sends the proposal. Received: the kept input is
 * forgotten. Expired session, outage or outdated site: the input is kept in the tab for its owner, the
 * address of the session (ADR 0019).
 */
export const proposePose = async (
  gateway: ContributionGateway,
  store: ProposalInputStore,
  input: PoseProposalInput,
  owner: string,
): Promise<Result<ProposalOutcome, ProposePoseError>> => {
  const proposal = validatePoseProposal(input);
  if (!proposal.ok) return fail({ kind: 'invalid-input', errors: proposal.error });

  const answer = await gateway.proposePose(proposal.value);
  if (answer.ok) {
    store.clear();
    return ok(answer.value);
  }

  const failure = answer.error;
  switch (failure.kind) {
    case 'invalid-content':
      return fail({ kind: 'invalid-input', errors: failure.errors });
    case 'unauthenticated':
      keepProposalInput(store, input, owner);
      return fail({ kind: 'session-expired' });
    case 'unreachable':
    case 'outdated':
      keepProposalInput(store, input, owner);
      return fail({ kind: failure.kind });
    default:
      return fail(failure);
  }
};

/** Keeps the input for its owner, until the person finds it again (expired session, outage). */
export const keepProposalInput = (store: ProposalInputStore, input: PoseProposalInput, owner: string): void =>
  store.save({ owner, input });

/**
 * The kept input, given once (then forgotten), to its owner only: the input of someone else is forgotten
 * (shared device).
 */
export const restoreProposalInput = (store: ProposalInputStore, owner: string): PoseProposalInput | null => {
  const kept = store.load();
  if (!kept) return null;
  store.clear();
  return kept.owner === owner ? kept.input : null;
};

import { fail, ok, type Result } from '../../domain/common/result';
import {
  validatePoseProposal,
  type PoseProposalInput,
  type ProposalFieldError,
} from '../../domain/contribution/pose-proposal';
import { tagAppliesToPoses } from '../../domain/shared-kernel/tag-scope';
import type { ChoosableTag, TagReference } from '../../domain/shared-kernel/tags';
import type { ContributionGateway, ProposalOutcome } from './ContributionGateway';
import type { ProposalInputStore } from './ProposalInputStorePort';

export type ProposePoseError =
  | { readonly kind: 'invalid-input'; readonly errors: readonly ProposalFieldError[] }
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  /** Story 9a: chosen tags refused meanwhile, named as the person chose them (the site takes them out of the input). */
  | { readonly kind: 'tags-not-in-list' | 'tags-not-applicable'; readonly tags: readonly TagReference[] }
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
    case 'unauthenticated':
      keepProposalInput(store, input, owner);
      return fail({ kind: 'session-expired' });
    case 'unreachable':
    case 'outdated':
      keepProposalInput(store, input, owner);
      return fail({ kind: failure.kind });
    case 'tags-not-in-list':
    case 'tags-not-applicable':
      return fail({ kind: failure.kind, tags: input.tags.filter((tag) => failure.tagIds.includes(tag.id)) });
    default:
      return fail(failure);
  }
};

/** Story 9a: the tags of the list that apply to poses, in catalog order, offered in the form of a pose (ADR 0035). */
export const listPoseTags = async (
  gateway: Pick<ContributionGateway, 'listTags'>,
): Promise<Result<readonly ChoosableTag[], { readonly kind: 'unreachable' | 'outdated' }>> => {
  const tags = await gateway.listTags();
  return tags.ok ? ok(tags.value.filter(tagAppliesToPoses)) : tags;
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

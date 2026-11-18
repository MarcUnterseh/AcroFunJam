import { fail, ok, type Result } from '../../domain/common/result';
import {
  validateTransitionProposal,
  type TransitionFieldError,
  type TransitionPose,
  type TransitionProposalInput,
} from '../../domain/contribution/transition-proposal';
import type { ChoosableTag, TagReference } from '../../domain/shared-kernel/transition-tags';
import { keepKeyedInput, restoreKeyedInput } from './keyed-input';
import type { TransitionInputStore } from './TransitionInputStorePort';
import type {
  TransitionPlaceTaken,
  TransitionPosesFailure,
  TransitionProposalGateway,
  TransitionProposalOutcome,
} from './TransitionProposalGateway';

// Story 7 « Proposer une transition »: the form of a person who may propose, opened from the page of a pose.

/** The form, as it opens: the choices of the two lists, the departure pose (the pose consulted), the tags of the list. */
export type TransitionProposalOpening = {
  readonly poses: readonly TransitionPose[];
  readonly fromPose: TransitionPose;
  readonly tags: readonly ChoosableTag[];
};

export type OpenTransitionProposalError =
  /** The pose consulted is not among the published poses: « Cette pose n'est plus dans le catalogue. » */
  { readonly kind: 'not-found' } | TransitionPosesFailure;

/**
 * The published poses, the departure pose among them (ADR 0030: no list of transitions is read to propose) and the tags
 * of the list (story 8).
 */
export const openTransitionProposal = async (
  gateway: TransitionProposalGateway,
  fromPoseId: string,
): Promise<Result<TransitionProposalOpening, OpenTransitionProposalError>> => {
  const [poses, tags] = await Promise.all([gateway.listPublishedPoses(), gateway.listTags()]);
  if (!poses.ok) return poses;
  if (!tags.ok) return tags;
  const fromPose = poses.value.find((pose) => pose.id === fromPoseId);
  return fromPose ? ok({ poses: poses.value, fromPose, tags: tags.value }) : fail({ kind: 'not-found' });
};

export type ProposeTransitionError =
  | { readonly kind: 'invalid-input'; readonly errors: readonly TransitionFieldError[] }
  /** The place is taken between these poses: told under the name. */
  | { readonly kind: TransitionPlaceTaken }
  /** A pose of the transition left the catalog meanwhile: told under its field. */
  | { readonly kind: 'pose-not-found'; readonly field: 'fromPoseId' | 'toPoseId' }
  /** Story 8: chosen tags left the list meanwhile, named as the person chose them. */
  | { readonly kind: 'tags-not-in-list'; readonly tags: readonly TagReference[] }
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

/**
 * Checks the input locally (no request if invalid), then sends the transition. Received: the kept input of the pose of
 * origin is forgotten. Expired session, outage or outdated site: the input is kept in the tab for its owner and its
 * pose of origin (ADR 0019).
 */
export const proposeTransition = async (
  gateway: TransitionProposalGateway,
  store: TransitionInputStore,
  originPoseId: string,
  input: TransitionProposalInput,
  owner: string,
): Promise<Result<TransitionProposalOutcome, ProposeTransitionError>> => {
  const transition = validateTransitionProposal(input);
  if (!transition.ok) return fail({ kind: 'invalid-input', errors: transition.error });

  const answer = await gateway.proposeTransition(transition.value);
  if (answer.ok) {
    store.clear(originPoseId);
    return answer;
  }
  const failure = answer.error;
  switch (failure.kind) {
    case 'unauthenticated':
      keepTransitionInput(store, originPoseId, input, owner);
      return fail({ kind: 'session-expired' });
    case 'unreachable':
    case 'outdated':
      keepTransitionInput(store, originPoseId, input, owner);
      return fail({ kind: failure.kind });
    case 'from-pose-not-found':
      return fail({ kind: 'pose-not-found', field: 'fromPoseId' });
    case 'to-pose-not-found':
      return fail({ kind: 'pose-not-found', field: 'toPoseId' });
    case 'tags-not-in-list':
      return fail({ kind: 'tags-not-in-list', tags: input.tags.filter((tag) => failure.tagIds.includes(tag.id)) });
    default:
      return fail(failure);
  }
};

/** Keeps the input of a transition for its owner and its pose of origin, until the person finds it again. */
export const keepTransitionInput = (
  store: TransitionInputStore,
  originPoseId: string,
  input: TransitionProposalInput,
  owner: string,
): void => keepKeyedInput(store, originPoseId, input, owner);

/** The kept input of the pose of origin, given once (then forgotten), to its owner only (shared device). */
export const restoreTransitionInput = (
  store: TransitionInputStore,
  originPoseId: string,
  owner: string,
): TransitionProposalInput | null => restoreKeyedInput(store, originPoseId, owner);

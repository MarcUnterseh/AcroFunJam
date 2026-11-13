import { fail, ok, type Result } from '../../domain/common/result';
import {
  validatePoseRevision,
  type PoseRevisionError,
  type PoseRevisionInput,
  type RevisablePose,
} from '../../domain/contribution/pose-revision';
import type { ProposalOutcome } from './ContributionGateway';
import type { PendingRevision, PoseRevisionGateway, RevisionOpeningFailure } from './PoseRevisionGateway';
import type { RevisionInputStore } from './RevisionInputStorePort';

// Story 6 « Proposer une modification d'une pose publiée »: the form of a person who may propose.

/** Why the form cannot be shown: what the site tells the person. */
export type OpenPoseRevisionError =
  | { readonly kind: 'not-found' }
  /** Visitor, expired session or deleted account: sign in again (ADR 0018). */
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

/** The form, as it opens: the pose with its current values and version, and its pending revision if any. */
export type PoseRevisionOpening = { readonly pose: RevisablePose; readonly pending: PendingRevision | null };

const openingError = (failure: RevisionOpeningFailure): OpenPoseRevisionError =>
  failure.kind === 'unauthenticated' ? { kind: 'session-expired' } : failure;

/**
 * The pose to revise and its pending revision (decision D): a pose that has one is told as soon as the form opens,
 * « la tienne » or not; the API refuses it anyway when sending.
 */
export const openPoseRevision = async (
  gateway: PoseRevisionGateway,
  poseId: string,
): Promise<Result<PoseRevisionOpening, OpenPoseRevisionError>> => {
  const pose = await gateway.getRevisablePose(poseId);
  if (!pose.ok) return fail(openingError(pose.error));
  const pending = await gateway.getPendingRevision(poseId);
  if (!pending.ok) return fail(openingError(pending.error));
  return ok({ pose: pose.value, pending: pending.value });
};

export type ProposePoseRevisionError =
  | PoseRevisionError
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  /** The pose changed meanwhile: its new values, read again, for the form to show them (R10). */
  | { readonly kind: 'pose-changed'; readonly pose: RevisablePose }
  | { readonly kind: 'revision-already-pending' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'session-expired' }
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'outdated' };

/**
 * Checks the input locally (no request if invalid or if nothing changes), then sends the changed fields only, from
 * the version read. Received: the kept input of the pose is forgotten. Expired session, outage or outdated site: the
 * input is kept in the tab for its owner and its pose (ADR 0019). The pose changed meanwhile: it is read again.
 */
export const proposePoseRevision = async (
  gateway: PoseRevisionGateway,
  store: RevisionInputStore,
  pose: RevisablePose,
  input: PoseRevisionInput,
  owner: string,
): Promise<Result<ProposalOutcome, ProposePoseRevisionError>> => {
  const revision = validatePoseRevision(pose, input);
  if (!revision.ok) return revision;

  const answer = await gateway.proposePoseRevision(revision.value);
  if (answer.ok) {
    store.clear(pose.id);
    return answer;
  }
  const failure = answer.error;
  switch (failure.kind) {
    case 'unauthenticated':
      keepRevisionInput(store, pose.id, input, owner);
      return fail({ kind: 'session-expired' });
    case 'unreachable':
    case 'outdated':
      keepRevisionInput(store, pose.id, input, owner);
      return fail({ kind: failure.kind });
    case 'pose-changed': {
      const current = await gateway.getRevisablePose(pose.id);
      return current.ok
        ? fail({ kind: 'pose-changed', pose: current.value })
        : fail(openingError(current.error));
    }
    default:
      return fail(failure);
  }
};

/** Keeps the input of a revision for its owner and its pose, until the person finds it again. */
export const keepRevisionInput = (
  store: RevisionInputStore,
  poseId: string,
  input: PoseRevisionInput,
  owner: string,
): void => store.save(poseId, { owner, input });

/**
 * The kept input of the pose, given once (then forgotten), to its owner only: the input of someone else is
 * forgotten (shared device).
 */
export const restoreRevisionInput = (
  store: RevisionInputStore,
  poseId: string,
  owner: string,
): PoseRevisionInput | null => {
  const kept = store.load(poseId);
  if (!kept) return null;
  store.clear(poseId);
  return kept.owner === owner ? kept.input : null;
};

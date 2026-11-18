import { fail, ok, type Result } from '../../domain/common/result';
import { checkAdjustmentNote, type AdjustmentNoteError } from '../../domain/contribution/adjustment-note';
import { adjustmentsOf } from '../../domain/contribution/pose-adjustment';
import type {
  PoseContent,
  PoseProposalInput,
  ProposalFieldError,
} from '../../domain/contribution/pose-proposal';
import { retainedRevisionChangesNothing, revisedPose } from '../../domain/contribution/pose-revision';
import { checkRejectionReason, type RejectionReasonError } from '../../domain/contribution/rejection-reason';
import {
  transitionAdjustmentsOf,
  type TransitionAdjustmentInput,
} from '../../domain/contribution/transition-adjustment';
import type { TransitionFieldError } from '../../domain/contribution/transition-proposal';
import type { ChoosableTag } from '../../domain/shared-kernel/transition-tags';
import type { TransitionPlaceTaken } from './TransitionProposalGateway';
import type { DecisionInputStore, KeptDecision } from './DecisionInputStorePort';
import type {
  Acceptance,
  AcceptanceOutcome,
  AccessFailure,
  DecisionFailure,
  PendingPoseOrRevision,
  PendingProposal,
  PendingTransitionProposal,
  ProposalReference,
  TransitionAcceptance,
  TransitionAcceptanceOutcome,
  ValidationGateway,
} from './ValidationGateway';

// Story 4 « Valider une proposition »: the validation queue, its count, and the decisions on a proposal.

/** Why the site cannot show the queue or decide, whatever the proposal: what it tells the validator. */
export type AccessError =
  /** Visitor, expired session or deleted account: sign in again (ADR 0018). */
  | { readonly kind: 'session-expired' }
  /** Still signed in, but no longer a validator nor an administrator (Q16): distinct from an expired session. */
  | { readonly kind: 'role-withdrawn' }
  | { readonly kind: 'unreachable' }
  /** A refusal the site does not know: it must be reloaded. */
  | { readonly kind: 'outdated' };

/** Why a decision was not recorded: what the site tells the validator, in the card of the proposal. */
export type DecisionError =
  | AccessError
  | { readonly kind: 'already-decided' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'name-already-in-catalog' }
  | { readonly kind: 'name-already-pending' }
  | { readonly kind: 'retained-revision-changes-nothing' }
  | { readonly kind: 'pose-changed' }
  | { readonly kind: TransitionPlaceTaken }
  | { readonly kind: 'transition-pose-not-found' }
  | { readonly kind: 'tags-not-in-list' };

export type RejectProposalError =
  DecisionError | { readonly kind: 'invalid-reason'; readonly code: RejectionReasonError };

export type AcceptProposalError =
  | DecisionError
  | { readonly kind: 'invalid-input'; readonly errors: readonly ProposalFieldError[] }
  | { readonly kind: 'invalid-note'; readonly code: AdjustmentNoteError };

/** The values the validator retained and the message typed for the contributor, as typed in the card. */
export type AdjustedDecision = { readonly input: PoseProposalInput; readonly note: string };

const accessError = (failure: AccessFailure): AccessError => {
  switch (failure.kind) {
    case 'unauthenticated':
      return { kind: 'session-expired' };
    case 'forbidden':
      return { kind: 'role-withdrawn' };
    default:
      return failure;
  }
};

const decisionError = (failure: DecisionFailure): DecisionError => {
  switch (failure.kind) {
    case 'unauthenticated':
    case 'forbidden':
    case 'unreachable':
    case 'outdated':
      return accessError(failure);
    default:
      return failure;
  }
};

const translated = <T>(answer: Result<T, AccessFailure>): Result<T, AccessError> =>
  answer.ok ? answer : fail(accessError(answer.error));

/** The proposals pending validation, the oldest first (the order is guaranteed by the API). */
export const getValidationQueue = async (
  gateway: ValidationGateway,
): Promise<Result<readonly PendingProposal[], AccessError>> => translated(await gateway.getValidationQueue());

/** How many proposals are pending validation (header of the site, glossary « Nombre de propositions à valider »). */
export const countPendingProposals = async (
  gateway: ValidationGateway,
): Promise<Result<number, AccessError>> => translated(await gateway.countPendingProposals());

/** The incidents after which the input is kept, to be sent again (ADR 0019); the apps follow it too. */
export const keepsDecisionInput = (error: Pick<DecisionError, 'kind'>): boolean =>
  error.kind === 'session-expired' || error.kind === 'unreachable' || error.kind === 'outdated';

/**
 * The answer of the API to a decision. Recorded: the kept input of the proposal is forgotten. Expired session,
 * outage or outdated site: the input is kept in the tab for its owner (ADR 0019), when there is one to keep.
 */
const recorded = <T>(
  store: DecisionInputStore,
  owner: string,
  proposalId: string,
  answer: Result<T, DecisionFailure>,
  input: KeptDecision | null,
): Result<T, DecisionError> => {
  if (answer.ok) {
    forgetDecisionInput(store, owner, proposalId);
    return answer;
  }
  const error = decisionError(answer.error);
  if (input && keepsDecisionInput(error)) keepDecisionInput(store, owner, proposalId, input);
  return fail(error);
};

/** Rejects a proposal with its reason, checked first (no request if invalid). Nothing is published. */
export const rejectProposal = async (
  gateway: ValidationGateway,
  store: DecisionInputStore,
  proposal: ProposalReference,
  rawReason: string,
  owner: string,
): Promise<Result<void, RejectProposalError>> => {
  const reason = checkRejectionReason(rawReason);
  if (!reason.ok) return fail({ kind: 'invalid-reason', code: reason.error });
  const answer = await gateway.rejectProposal(proposal, reason.value);
  return recorded(store, owner, proposal.id, answer, { kind: 'rejection', reason: rawReason });
};

const asProposed: Acceptance = { adjustments: [], note: null };

/**
 * The pose the validator accepts as proposed, and adjusts from: the proposed pose, or the published pose with the
 * values a revision changes (story 6).
 */
export const proposedPoseOf = (proposal: PendingPoseOrRevision): PoseContent =>
  proposal.kind === 'pose-revision' ? revisedPose(proposal.pose, proposal.changes) : proposal.pose;

/** What to send: the adjustments and the note, or an acceptance as proposed when nothing differs. */
const acceptanceOf = (
  proposal: PendingPoseOrRevision,
  adjusted: AdjustedDecision | null,
): Result<Acceptance, AcceptProposalError> => {
  if (!adjusted) return ok(asProposed);
  const adjustments = adjustmentsOf(proposedPoseOf(proposal), adjusted.input);
  if (!adjustments.ok) return fail({ kind: 'invalid-input', errors: adjustments.error });
  // A revision whose retained values leave the pose as it is cannot be accepted (R15): it is to be rejected.
  if (
    proposal.kind === 'pose-revision' &&
    retainedRevisionChangesNothing(proposal.pose, proposal.changes, adjustments.value)
  )
    return fail({ kind: 'retained-revision-changes-nothing' });
  const note = checkAdjustmentNote(adjusted.note);
  if (!note.ok) return fail({ kind: 'invalid-note', code: note.error });
  // A note only accompanies adjustments (R9 ter): without any, the acceptance is as proposed.
  return ok(adjustments.value.length > 0 ? { adjustments: adjustments.value, note: note.value } : asProposed);
};

/**
 * Accepts a proposal, as proposed (no adjusted decision) or with the values retained by the validator, checked
 * first (no request if invalid). The API publishes the retained pose.
 *
 * A message only accompanies adjustments (R9 ter): when no retained value differs from the proposed one, the
 * message is dropped and the proposal is accepted as proposed (no request refused for it).
 */
export const acceptProposal = async (
  gateway: ValidationGateway,
  store: DecisionInputStore,
  proposal: PendingPoseOrRevision,
  adjusted: AdjustedDecision | null,
  owner: string,
): Promise<Result<AcceptanceOutcome, AcceptProposalError>> => {
  const acceptance = acceptanceOf(proposal, adjusted);
  if (!acceptance.ok) return acceptance;
  const answer = await gateway.acceptProposal(proposal, acceptance.value);
  return recorded(store, owner, proposal.id, answer, adjusted && { kind: 'acceptance', ...adjusted });
};

export type AcceptTransitionError =
  | DecisionError
  | { readonly kind: 'invalid-input'; readonly errors: readonly TransitionFieldError[] }
  | { readonly kind: 'invalid-note'; readonly code: AdjustmentNoteError };

/** The values of a transition the validator retained and the message typed for the contributor (story 7). */
export type AdjustedTransitionDecision = { readonly input: TransitionAdjustmentInput; readonly note: string };

const asProposedTransition: TransitionAcceptance = { adjustments: [], note: null };

/** What to send for a transition: the adjustments and the note, or an acceptance as proposed when nothing differs. */
const transitionAcceptanceOf = (
  proposal: PendingTransitionProposal,
  adjusted: AdjustedTransitionDecision | null,
): Result<TransitionAcceptance, AcceptTransitionError> => {
  if (!adjusted) return ok(asProposedTransition);
  const adjustments = transitionAdjustmentsOf(proposal.transition, adjusted.input);
  if (!adjustments.ok) return fail({ kind: 'invalid-input', errors: adjustments.error });
  const note = checkAdjustmentNote(adjusted.note);
  if (!note.ok) return fail({ kind: 'invalid-note', code: note.error });
  // A note only accompanies adjustments (R9 ter): without any, the acceptance is as proposed.
  return ok(
    adjustments.value.length > 0
      ? { adjustments: adjustments.value, note: note.value }
      : asProposedTransition,
  );
};

/**
 * Accepts a transition (story 7), as proposed or with the values retained by the validator (never its poses), checked
 * first (no request if invalid). The API publishes the retained transition, unless its place is taken meanwhile.
 */
export const acceptTransitionProposal = async (
  gateway: ValidationGateway,
  store: DecisionInputStore,
  proposal: PendingTransitionProposal,
  adjusted: AdjustedTransitionDecision | null,
  owner: string,
): Promise<Result<TransitionAcceptanceOutcome, AcceptTransitionError>> => {
  const acceptance = transitionAcceptanceOf(proposal, adjusted);
  if (!acceptance.ok) return acceptance;
  const answer = await gateway.acceptTransitionProposal(proposal, acceptance.value);
  return recorded(
    store,
    owner,
    proposal.id,
    answer,
    adjusted && { kind: 'transition-acceptance', ...adjusted },
  );
};

/** Keeps the input of a decision for its owner, next to the other proposals of the same owner. */
export const keepDecisionInput = (
  store: DecisionInputStore,
  owner: string,
  proposalId: string,
  decision: KeptDecision,
): void => {
  const kept = store.load();
  const decisions = kept?.owner === owner ? kept.decisions : {};
  store.save({ owner, decisions: { ...decisions, [proposalId]: decision } });
};

/** The decision is recorded: its kept input, typed by the same owner, is no longer needed. */
const forgetDecisionInput = (store: DecisionInputStore, owner: string, proposalId: string): void => {
  const kept = store.load();
  if (kept?.owner !== owner || !(proposalId in kept.decisions)) return;
  const decisions = Object.fromEntries(Object.entries(kept.decisions).filter(([id]) => id !== proposalId));
  store.save({ owner: kept.owner, decisions });
};

/**
 * The kept inputs, by proposal id, given once (then forgotten), to their owner only: the inputs of someone else
 * are forgotten (shared device).
 */
export const restoreDecisionInputs = (
  store: DecisionInputStore,
  owner: string,
): Readonly<Record<string, KeptDecision>> => {
  const kept = store.load();
  store.clear();
  return kept?.owner === owner ? kept.decisions : {};
};

/** Story 8: the tags of the list, in catalog order, offered in the adjustment zone of a transition. */
export const listTransitionTags = async (
  gateway: ValidationGateway,
): Promise<Result<readonly ChoosableTag[], AccessError>> => translated(await gateway.listTags());

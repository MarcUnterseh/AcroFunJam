import {
  acceptProposal,
  adjustedNameRefusalLabel,
  adjustmentsOf,
  poseNameLength,
  proposalFieldErrorLabel,
  proposedPoseOf,
  retainedRevisionChangesNothing,
  type AcceptProposalError,
  type KeptDecision,
  type PendingPoseOrRevision,
  type PoseAdjustment,
  type PoseProposalInput,
  type ProposalField,
  type ProposalFieldError,
  type RecordedDecision,
} from '@acrofunjam/core';
import { useRef, useState } from 'react';
import { nameCounter } from './NameCounter';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { useDecisionCard } from './useDecisionCard';
import { useValidation } from './ValidationContext';

export type { Mode, Sending } from './useDecisionCard';

type NameRefusal = 'name-already-in-catalog' | 'name-already-pending';

/**
 * The decision on a pose proposal or a revision, as its card lets the validator take it (carte-proposition.md): the
 * common decision of a card (useDecisionCard), with the adjusted values of a pose. ProposalCard only displays it. A
 * recorded decision is handed to the queue (onDecided).
 */
export function useProposalDecision({
  proposal,
  owner,
  kept,
  onDecided,
}: {
  readonly proposal: PendingPoseOrRevision;
  readonly owner: string;
  readonly kept: KeptDecision | undefined;
  readonly onDecided: (recorded: RecordedDecision) => void;
}) {
  const { gateway, store } = useValidation();
  const announceNameCounter = useCounterAnnouncement(nameCounter);
  // The pose accepted as proposed, and adjusted from: the proposed pose, or the revised pose (story 6).
  const proposed: PoseProposalInput = proposedPoseOf(proposal);
  const [input, setInput] = useState<PoseProposalInput>(kept?.kind === 'acceptance' ? kept.input : proposed);
  const [inputErrors, setInputErrors] = useState<readonly ProposalFieldError[]>([]);
  const [nameRefusal, setNameRefusal] = useState<NameRefusal | null>(null);
  const [nothingAdjusted, setNothingAdjusted] = useState(false);
  const [adjustments, setAdjustments] = useState<readonly PoseAdjustment[]>([]);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    canStartFlow: useRef<HTMLInputElement>(null),
    canEndFlow: useRef<HTMLInputElement>(null),
  };
  const card = useDecisionCard<ProposalField>({
    proposal,
    owner,
    kept,
    fieldRefs,
    firstField: 'name',
    keptAcceptance: (note) => ({ kind: 'acceptance', input, note }),
    onCancel: () => {
      setInput(proposed);
      setInputErrors([]);
      setNameRefusal(null);
      setNothingAdjusted(false);
    },
  });
  const { mode, setMode, setFocus, setAlert, setAttempt, note } = card;
  const name = proposal.pose.name;

  /** The failures about the adjusted values of a pose; the others are common to every card. */
  const ownFailure = (error: AcceptProposalError): boolean => {
    switch (error.kind) {
      case 'invalid-input':
        setMode('adjusting');
        setInputErrors(error.errors);
        setFocus(error.errors[0]?.field ?? 'name');
        return true;
      case 'retained-revision-changes-nothing':
        // The retained revision would leave the pose as it is: the form is given back, with the alert.
        setMode('adjusting');
        setFocus('name');
        return false;
      case 'name-already-in-catalog':
      case 'name-already-pending':
        // With adjustments, the retained name is refused: the form is given back, the error on the name.
        if (mode !== 'summary') return false;
        setMode('adjusting');
        setNameRefusal(error.kind);
        setFocus('name');
        return true;
      default:
        return false;
    }
  };

  const accepted = (outcome: { name: string; adjusted: boolean }) =>
    onDecided({ proposal: proposal.kind, decision: 'accepted', ...outcome });
  const accept = () =>
    void card.send(
      'accept',
      () => acceptProposal(gateway, store, proposal, null, owner),
      accepted,
      ownFailure,
    );
  const publish = () =>
    void card.send(
      'publish',
      () => acceptProposal(gateway, store, proposal, { input, note }, owner),
      accepted,
      ownFailure,
    );
  const reject = () => card.reject(() => onDecided({ proposal: proposal.kind, decision: 'rejected', name }));

  const change = <F extends keyof PoseProposalInput>(field: F, value: PoseProposalInput[F]) => {
    if (field === 'name') announceNameCounter(poseNameLength(input.name), poseNameLength(value as string));
    setInput((current) => ({ ...current, [field]: value }));
    setInputErrors((current) => current.filter((error) => error.field !== field));
    if (field === 'name') setNameRefusal(null);
    setNothingAdjusted(false);
    // The retained values change: the alert « la pose ne changerait pas » no longer applies.
    setAlert((current) => (current === 'retained-revision-changes-nothing' ? null : current));
  };
  const errorOf = (field: ProposalField): string | undefined => {
    if (field === 'name' && nameRefusal) return adjustedNameRefusalLabel(nameRefusal);
    const error = inputErrors.find((e) => e.field === field);
    return error ? proposalFieldErrorLabel(error.code, poseNameLength(input.name)) : undefined;
  };

  /** « Vérifier les ajustements »: the summary, the errors in the form, or nothing to adjust. */
  const check = () => {
    const checked = adjustmentsOf(proposedPoseOf(proposal), input);
    if (!checked.ok) {
      setInputErrors(checked.error);
      setFocus(checked.error[0]?.field ?? 'name');
      return;
    }
    setAlert((current) => (current === 'retained-revision-changes-nothing' ? null : current));
    if (checked.value.length === 0) {
      setNothingAdjusted(true);
      return;
    }
    // A revision whose retained values would leave the pose as it is cannot be accepted (R15): told at once.
    if (
      proposal.kind === 'pose-revision' &&
      retainedRevisionChangesNothing(proposal.pose, proposal.changes, checked.value)
    ) {
      setAttempt((n) => n + 1);
      setAlert('retained-revision-changes-nothing');
      return;
    }
    setAdjustments(checked.value);
    setMode('summary');
    setFocus('summary');
  };
  const editAdjustments = () => {
    setMode('adjusting');
    setFocus('name');
  };

  return {
    ...card,
    refs: { ...card.refs, ...fieldRefs },
    input,
    nothingAdjusted,
    adjustments,
    errorOf,
    accept,
    publish,
    reject,
    change,
    check,
    editAdjustments,
  };
}

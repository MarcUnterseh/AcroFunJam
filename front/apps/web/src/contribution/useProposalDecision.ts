import {
  acceptProposal,
  adjustedNameRefusalLabel,
  adjustmentsOf,
  checkAdjustmentNote,
  checkRejectionReason,
  keepDecisionInput,
  keepsDecisionInput,
  poseNameLength,
  proposalFieldErrorLabel,
  proposedPoseOf,
  rejectProposal,
  retainedRevisionChangesNothing,
  validatorTextLength,
  type AcceptProposalError,
  type AdjustmentNoteError,
  type KeptDecision,
  type PendingProposal,
  type PoseAdjustment,
  type PoseProposalInput,
  type ProposalField,
  type ProposalFieldError,
  type RecordedDecision,
  type RejectionReasonError,
  type RejectProposalError,
  type Result,
} from '@acrofunjam/core';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../identity/SessionContext';
import { closesTheCard, type CardAlert } from './DecisionAlert';
import { nameCounter } from './NameCounter';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { usePendingCountUpdates } from './usePendingCount';
import { useValidation } from './ValidationContext';
import { validatorTextCounter } from './ValidatorTextCounter';

export type Sending = 'accept' | 'reject' | 'publish';
/** What the card shows: the pose and the decisions, or one of the zones opened in it. */
export type Mode = 'rest' | 'rejecting' | 'adjusting' | 'summary';
type FocusTarget =
  'title' | 'retry' | 'reason' | 'reject' | 'adjust' | 'name' | 'summary' | 'note' | ProposalField;
type DecisionFailure = AcceptProposalError | RejectProposalError;
type NameRefusal = 'name-already-in-catalog' | 'name-already-pending';

/** The zone a kept input opens again (ADR 0019): the reason, or the adjustment form with the message. */
const modeOf = (kept: KeptDecision | undefined): Mode =>
  !kept ? 'rest' : kept.kind === 'rejection' ? 'rejecting' : 'adjusting';

/**
 * The decision on a proposal, as its card lets the validator take it (carte-proposition.md): which zone is open,
 * what was typed, what is being sent, the alert of the last attempt, and where the focus goes. ProposalCard only
 * displays it. A recorded decision is handed to the queue (onDecided).
 */
export function useProposalDecision({
  proposal,
  owner,
  kept,
  onDecided,
}: {
  readonly proposal: PendingProposal;
  readonly owner: string;
  readonly kept: KeptDecision | undefined;
  readonly onDecided: (recorded: RecordedDecision) => void;
}) {
  const { gateway, store } = useValidation();
  const { session, sessionExpired } = useSession();
  const { reread } = usePendingCountUpdates();
  const announceTextCounter = useCounterAnnouncement(validatorTextCounter);
  const announceNameCounter = useCounterAnnouncement(nameCounter);
  // The pose accepted as proposed, and adjusted from: the proposed pose, or the revised pose (story 6).
  const proposed: PoseProposalInput = proposedPoseOf(proposal);
  const [mode, setMode] = useState<Mode>(modeOf(kept));
  const [reason, setReason] = useState(kept?.kind === 'rejection' ? kept.reason : '');
  const [reasonError, setReasonError] = useState<RejectionReasonError | null>(null);
  const [input, setInput] = useState<PoseProposalInput>(kept?.kind === 'acceptance' ? kept.input : proposed);
  const [inputErrors, setInputErrors] = useState<readonly ProposalFieldError[]>([]);
  const [nameRefusal, setNameRefusal] = useState<NameRefusal | null>(null);
  const [nothingAdjusted, setNothingAdjusted] = useState(false);
  const [adjustments, setAdjustments] = useState<readonly PoseAdjustment[]>([]);
  const [note, setNote] = useState(kept?.kind === 'acceptance' ? kept.note : '');
  const [noteError, setNoteError] = useState<AdjustmentNoteError | null>(null);
  const [alert, setAlert] = useState<CardAlert | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState<Sending | null>(null);
  const [lastSent, setLastSent] = useState<Sending>('accept');
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const busy = useRef(false);
  const refs = {
    title: useRef<HTMLHeadingElement>(null),
    retry: useRef<HTMLButtonElement>(null),
    reason: useRef<HTMLTextAreaElement>(null),
    reject: useRef<HTMLButtonElement>(null),
    adjust: useRef<HTMLButtonElement>(null),
    name: useRef<HTMLInputElement>(null),
    summary: useRef<HTMLHeadingElement>(null),
    note: useRef<HTMLTextAreaElement>(null),
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    canStartFlow: useRef<HTMLInputElement>(null),
    canEndFlow: useRef<HTMLInputElement>(null),
  };
  const name = proposal.pose.name;

  // Focus after a render: the zone opened or closed, a field in error, or « Réessayer » of the alert given anew.
  useEffect(() => {
    if (!focus) return;
    refs[focus].current?.focus();
    setFocus(null);
  }, [focus]);

  // Signed in again (another tab): the "session expired" alert no longer applies.
  useEffect(() => {
    if (session.status === 'signedIn')
      setAlert((current) => (current === 'session-expired' ? null : current));
  }, [session.status]);

  // While the input is said to be kept (expired session, outage), what the validator keeps typing is kept too.
  // After these incidents, the input is kept in the tab and follows every keystroke (ADR 0019).
  const inputKept = alert !== null && keepsDecisionInput({ kind: alert });
  useEffect(() => {
    if (!inputKept || mode === 'rest') return;
    const decision: KeptDecision =
      mode === 'rejecting' ? { kind: 'rejection', reason } : { kind: 'acceptance', input, note };
    keepDecisionInput(store, owner, proposal.id, decision);
  }, [inputKept, mode, reason, input, note, store, owner, proposal.id]);

  const failed = (error: DecisionFailure, retrying: boolean) => {
    switch (error.kind) {
      case 'invalid-reason':
        setReasonError(error.code);
        setFocus('reason');
        return;
      case 'invalid-note':
        setNoteError(error.code);
        setFocus('note');
        return;
      case 'invalid-input':
        setMode('adjusting');
        setInputErrors(error.errors);
        setFocus(error.errors[0]?.field ?? 'name');
        return;
      case 'retained-revision-changes-nothing':
        // The retained revision would leave the pose as it is: the form is given back, with the alert.
        setMode('adjusting');
        setFocus('name');
        break;
      case 'name-already-in-catalog':
      case 'name-already-pending':
        // With adjustments, the retained name is refused: the form is given back, the error on the name.
        if (mode === 'summary') {
          setMode('adjusting');
          setNameRefusal(error.kind);
          setFocus('name');
          return;
        }
        break;
      case 'already-decided':
      case 'not-found':
        reread(); // the proposal left the queue: the number of the header is no longer right
        break;
      case 'session-expired':
        sessionExpired();
        break;
      case 'unreachable':
        if (retrying) setFocus('retry');
    }
    // The decisions disappear: the focus goes to the name of the proposal, then the alert is announced.
    if (closesTheCard(error.kind)) setFocus('title');
    setAttempt((n) => n + 1); // a new alert node: an identical failure is announced again
    setAlert(error.kind);
  };

  /** Sends a decision once, even before the next render; its trigger shows it is busy. */
  const send = async <T>(
    action: Sending,
    decide: () => Promise<Result<T, DecisionFailure>>,
    recorded: (value: T) => RecordedDecision,
    retrying: boolean,
  ) => {
    if (busy.current) return;
    busy.current = true;
    // An alert of a previous attempt no longer applies; while retrying, it stays (its busy button keeps the focus).
    if (!retrying) setAlert(null);
    setSending(action);
    setLastSent(action);
    const result = await decide();
    busy.current = false;
    setSending(null);
    setAlert(null);
    if (result.ok) onDecided(recorded(result.value));
    else failed(result.error, retrying);
  };

  const accepted = (outcome: { name: string; adjusted: boolean }): RecordedDecision => ({
    proposal: proposal.kind,
    decision: 'accepted',
    ...outcome,
  });
  const accept = (retrying = false) =>
    send('accept', () => acceptProposal(gateway, store, proposal, null, owner), accepted, retrying);
  const publish = (retrying = false) =>
    send(
      'publish',
      () => acceptProposal(gateway, store, proposal, { input, note }, owner),
      accepted,
      retrying,
    );
  const reject = (retrying = false) =>
    send(
      'reject',
      () => rejectProposal(gateway, store, proposal, reason, owner),
      () => ({ proposal: proposal.kind, decision: 'rejected', name }),
      retrying,
    );
  const retry = () => void { accept, publish, reject }[lastSent](true);

  const open = (zone: 'rejecting' | 'adjusting') => {
    setMode(zone);
    setFocus(zone === 'rejecting' ? 'reason' : 'name');
  };
  /** Back to the pose as proposed: the zone and its input are dropped. */
  const cancel = () => {
    const opener = mode === 'rejecting' ? 'reject' : 'adjust';
    setMode('rest');
    setReason('');
    setReasonError(null);
    setInput(proposed);
    setInputErrors([]);
    setNameRefusal(null);
    setNothingAdjusted(false);
    setNote('');
    setNoteError(null);
    setAlert(null);
    setFocus(opener);
  };

  const changeReason = (value: string) => {
    announceTextCounter(validatorTextLength(reason), validatorTextLength(value));
    setReason(value);
    // A message disappears once the field is corrected; it only changes before sending again.
    if (reasonError) {
      const checked = checkRejectionReason(value);
      setReasonError(checked.ok ? null : checked.error);
    }
  };
  const changeNote = (value: string) => {
    announceTextCounter(validatorTextLength(note), validatorTextLength(value));
    setNote(value);
    if (noteError) {
      const checked = checkAdjustmentNote(value);
      setNoteError(checked.ok ? null : checked.error);
    }
  };
  const change = <F extends ProposalField>(field: F, value: PoseProposalInput[F]) => {
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
    mode,
    reason,
    reasonError,
    input,
    note,
    noteError,
    nothingAdjusted,
    adjustments,
    alert,
    attempt,
    sending,
    refs,
    /** The proposal can no longer be decided from its card: its actions disappear. */
    closed: closesTheCard(alert),
    errorOf,
    accept: () => void accept(),
    publish: () => void publish(),
    reject: () => void reject(),
    retry,
    open,
    cancel,
    changeReason,
    changeNote,
    change,
    check,
    editAdjustments,
  };
}

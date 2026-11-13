import {
  checkAdjustmentNote,
  checkRejectionReason,
  keepDecisionInput,
  keepsDecisionInput,
  rejectProposal,
  validatorTextLength,
  type AdjustmentNoteError,
  type DecisionError,
  type KeptDecision,
  type ProposalReference,
  type RejectionReasonError,
  type Result,
} from '@acrofunjam/core';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSession } from '../identity/SessionContext';
import { closesTheCard, type CardAlert } from './DecisionAlert';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { usePendingCountUpdates } from './usePendingCount';
import { useValidation } from './ValidationContext';
import { validatorTextCounter } from './ValidatorTextCounter';

export type Sending = 'accept' | 'reject' | 'publish';
/** What the card shows: the proposal and the decisions, or one of the zones opened in it. */
export type Mode = 'rest' | 'rejecting' | 'adjusting' | 'summary';

/** The failures every decision may meet; the card of a kind of proposal handles its own (its adjusted fields). */
type CommonFailure =
  | DecisionError
  | { readonly kind: 'invalid-reason'; readonly code: RejectionReasonError }
  | { readonly kind: 'invalid-note'; readonly code: AdjustmentNoteError };

type CardRefs = {
  readonly title: RefObject<HTMLHeadingElement | null>;
  readonly retry: RefObject<HTMLButtonElement | null>;
  readonly reason: RefObject<HTMLTextAreaElement | null>;
  readonly reject: RefObject<HTMLButtonElement | null>;
  readonly adjust: RefObject<HTMLButtonElement | null>;
  readonly summary: RefObject<HTMLHeadingElement | null>;
  readonly note: RefObject<HTMLTextAreaElement | null>;
};

/** The zone a kept input opens again (ADR 0019): the reason, or the adjustment zone with the message. */
const modeOf = (kept: KeptDecision | undefined): Mode =>
  !kept ? 'rest' : kept.kind === 'rejection' ? 'rejecting' : 'adjusting';

/**
 * What every card of the validation queue shares (carte-proposition.md), whatever the kind of proposal: the zone
 * open, the reason and the note, what is being sent, the alert of the last attempt and its retry, the input kept in
 * the tab after an incident, and where the focus goes. The hook of a kind of proposal adds its adjusted fields: their
 * refs (to give them the focus), how to keep them, and the failures about them.
 */
export function useDecisionCard<Field extends string>({
  proposal,
  owner,
  kept,
  fieldRefs,
  firstField,
  keptAcceptance,
  onCancel,
}: {
  readonly proposal: ProposalReference;
  readonly owner: string;
  readonly kept: KeptDecision | undefined;
  /** The adjusted fields, by name, to give them the focus. */
  readonly fieldRefs: Readonly<Record<Field, RefObject<HTMLElement | null>>>;
  /** The field that takes the focus when the adjustment zone opens. */
  readonly firstField: Field;
  /** The acceptance typed in the adjustment zone, as kept in the tab. */
  readonly keptAcceptance: (note: string) => KeptDecision;
  /** Back to the proposal as proposed: the adjusted fields are dropped. */
  readonly onCancel: () => void;
}) {
  const { gateway, store } = useValidation();
  const { session, sessionExpired } = useSession();
  const { reread } = usePendingCountUpdates();
  const announceTextCounter = useCounterAnnouncement(validatorTextCounter);
  const [mode, setMode] = useState<Mode>(modeOf(kept));
  const [reason, setReason] = useState(kept?.kind === 'rejection' ? kept.reason : '');
  const [reasonError, setReasonError] = useState<RejectionReasonError | null>(null);
  const [note, setNote] = useState(kept && kept.kind !== 'rejection' ? kept.note : '');
  const [noteError, setNoteError] = useState<AdjustmentNoteError | null>(null);
  const [alert, setAlert] = useState<CardAlert | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sending, setSending] = useState<Sending | null>(null);
  const [focus, setFocus] = useState<keyof CardRefs | Field | null>(null);
  const busy = useRef(false);
  const lastAttempt = useRef<() => void>(() => undefined);
  const refs: CardRefs = {
    title: useRef<HTMLHeadingElement>(null),
    retry: useRef<HTMLButtonElement>(null),
    reason: useRef<HTMLTextAreaElement>(null),
    reject: useRef<HTMLButtonElement>(null),
    adjust: useRef<HTMLButtonElement>(null),
    summary: useRef<HTMLHeadingElement>(null),
    note: useRef<HTMLTextAreaElement>(null),
  };

  // Focus after a render: the zone opened or closed, a field in error, or « Réessayer » of the alert given anew.
  useEffect(() => {
    if (!focus) return;
    const target =
      (refs as Record<string, RefObject<HTMLElement | null>>)[focus] ?? fieldRefs[focus as Field];
    target?.current?.focus();
    setFocus(null);
  }, [focus]);

  // Signed in again (another tab): the "session expired" alert no longer applies.
  useEffect(() => {
    if (session.status === 'signedIn')
      setAlert((current) => (current === 'session-expired' ? null : current));
  }, [session.status]);

  // After an expired session or an outage, what the validator keeps typing is kept in the tab too (ADR 0019).
  const inputKept = alert !== null && keepsDecisionInput({ kind: alert });
  const keptNow: KeptDecision | null =
    mode === 'rest' ? null : mode === 'rejecting' ? { kind: 'rejection', reason } : keptAcceptance(note);
  const keptKey = JSON.stringify(keptNow);
  useEffect(() => {
    if (inputKept && keptNow) keepDecisionInput(store, owner, proposal.id, keptNow);
  }, [inputKept, keptKey, store, owner, proposal.id]);

  /** A failure of a decision, after the card of the kind of proposal handled its own (true when it did). */
  const failed = (error: CommonFailure, retrying: boolean) => {
    switch (error.kind) {
      case 'invalid-reason':
        setReasonError(error.code);
        setFocus('reason');
        return;
      case 'invalid-note':
        setNoteError(error.code);
        setFocus('note');
        return;
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
    // The decisions disappear: the focus goes to the title of the proposal, then the alert is announced.
    if (closesTheCard(error.kind)) setFocus('title');
    setAttempt((n) => n + 1); // a new alert node: an identical failure is announced again
    setAlert(error.kind);
  };

  /**
   * Sends a decision once, even before the next render; its trigger shows it is busy. A failure goes first to
   * `ownFailure` (the adjusted fields of the kind of proposal), then to the common handling.
   */
  const send = async <T, E extends { readonly kind: string }>(
    action: Sending,
    decide: () => Promise<Result<T, E>>,
    recorded: (value: T) => void,
    ownFailure: (error: E) => boolean,
    retrying = false,
  ) => {
    if (busy.current) return;
    busy.current = true;
    lastAttempt.current = () => void send(action, decide, recorded, ownFailure, true);
    // An alert of a previous attempt no longer applies; while retrying, it stays (its busy button keeps the focus).
    if (!retrying) setAlert(null);
    setSending(action);
    const result = await decide();
    busy.current = false;
    setSending(null);
    setAlert(null);
    if (result.ok) recorded(result.value);
    else if (!ownFailure(result.error)) failed(result.error as unknown as CommonFailure, retrying);
  };

  const reject = (recorded: () => void) =>
    void send(
      'reject',
      () => rejectProposal(gateway, store, proposal, reason, owner),
      recorded,
      () => false,
    );

  const open = (zone: 'rejecting' | 'adjusting') => {
    setMode(zone);
    setFocus(zone === 'rejecting' ? 'reason' : firstField);
  };

  const cancel = () => {
    const opener = mode === 'rejecting' ? 'reject' : 'adjust';
    setMode('rest');
    setReason('');
    setReasonError(null);
    setNote('');
    setNoteError(null);
    setAlert(null);
    onCancel();
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

  return {
    mode,
    setMode,
    reason,
    reasonError,
    note,
    noteError,
    alert,
    setAlert,
    attempt,
    setAttempt,
    sending,
    refs,
    setFocus,
    /** The proposal can no longer be decided from its card: its actions disappear. */
    closed: closesTheCard(alert),
    send,
    reject,
    retry: () => lastAttempt.current(),
    open,
    cancel,
    changeReason,
    changeNote,
  };
}

import {
  acceptTransitionProposal,
  adjustedTransitionNameRefusalLabel,
  transitionAdjustmentInputOf,
  transitionAdjustmentsOf,
  transitionDescriptionLength,
  transitionFieldErrorLabel,
  transitionNameLength,
  type AcceptTransitionError,
  type AdjustableTransitionField,
  type KeptDecision,
  type PendingTransitionProposal,
  type RecordedTransitionDecision,
  type TransitionAcceptanceOutcome,
  type TransitionAdjustment,
  type TransitionAdjustmentInput,
  type TransitionFieldError,
  type TransitionPlaceTaken,
} from '@acrofunjam/core';
import { useRef, useState } from 'react';
import { descriptionCounter } from './DescriptionCounter';
import { nameCounter } from './NameCounter';
import { useCounterAnnouncement } from './useCounterAnnouncement';
import { useDecisionCard } from './useDecisionCard';
import { useValidation } from './ValidationContext';

/** The kinds of the place of a transition taken between its poses: told under the name when adjusted. */
const placesTaken: readonly string[] = [
  'transition-name-already-in-catalog',
  'transition-name-already-pending',
  'unnamed-transition-already-in-catalog',
  'unnamed-transition-already-pending',
] satisfies TransitionPlaceTaken[];

/**
 * The decision on a transition, as its card lets the validator take it (carte-transition.md): the common decision of
 * a card (useDecisionCard), with the adjusted values of a transition (name, difficulties, description), never its
 * poses. TransitionProposalCard only displays it; a recorded decision is handed to the queue (onDecided).
 */
export function useTransitionDecision({
  proposal,
  owner,
  kept,
  onDecided,
}: {
  readonly proposal: PendingTransitionProposal;
  readonly owner: string;
  readonly kept: KeptDecision | undefined;
  readonly onDecided: (recorded: RecordedTransitionDecision) => void;
}) {
  const { gateway, store } = useValidation();
  const announceNameCounter = useCounterAnnouncement(nameCounter);
  const announceDescriptionCounter = useCounterAnnouncement(descriptionCounter);
  const proposed = transitionAdjustmentInputOf(proposal.transition);
  const [input, setInput] = useState<TransitionAdjustmentInput>(
    kept?.kind === 'transition-acceptance' ? kept.input : proposed,
  );
  const [inputErrors, setInputErrors] = useState<readonly TransitionFieldError[]>([]);
  const [nameRefusal, setNameRefusal] = useState<TransitionPlaceTaken | null>(null);
  const [nothingAdjusted, setNothingAdjusted] = useState(false);
  const [adjustments, setAdjustments] = useState<readonly TransitionAdjustment[]>([]);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    baseDifficulty: useRef<HTMLInputElement>(null),
    flyerDifficulty: useRef<HTMLInputElement>(null),
    tags: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
  };
  const card = useDecisionCard<AdjustableTransitionField>({
    proposal,
    owner,
    kept,
    fieldRefs,
    firstField: 'name',
    keptAcceptance: (note) => ({ kind: 'transition-acceptance', input, note }),
    onCancel: () => {
      setInput(proposed);
      setInputErrors([]);
      setNameRefusal(null);
      setNothingAdjusted(false);
    },
  });
  const { mode, setMode, setFocus, note } = card;
  const poses = { from: proposal.fromPose.name, to: proposal.toPose.name };

  /** The failures about the adjusted values of a transition; the others are common to every card. */
  const ownFailure = (error: AcceptTransitionError): boolean => {
    if (error.kind === 'invalid-input') {
      setMode('adjusting');
      setInputErrors(error.errors);
      setFocus((error.errors[0]?.field as AdjustableTransitionField | undefined) ?? 'name');
      return true;
    }
    // With adjustments, the retained name (or its absence) is refused: the zone is given back, under the name.
    if (placesTaken.includes(error.kind) && mode === 'summary') {
      setMode('adjusting');
      setNameRefusal(error.kind as TransitionPlaceTaken);
      setFocus('name');
      return true;
    }
    return false;
  };

  const accepted = (outcome: TransitionAcceptanceOutcome) =>
    onDecided({
      proposal: 'transition-proposal',
      decision: 'accepted',
      transition: { name: outcome.name, from: outcome.fromPose.name, to: outcome.toPose.name },
      adjusted: outcome.adjusted,
    });
  const accept = () =>
    void card.send(
      'accept',
      () => acceptTransitionProposal(gateway, store, proposal, null, owner),
      accepted,
      ownFailure,
    );
  const publish = () =>
    void card.send(
      'publish',
      () => acceptTransitionProposal(gateway, store, proposal, { input, note }, owner),
      accepted,
      ownFailure,
    );
  const reject = () =>
    card.reject(() =>
      onDecided({
        proposal: 'transition-proposal',
        decision: 'rejected',
        transition: { name: proposal.transition.name, ...poses },
      }),
    );

  const change = <F extends AdjustableTransitionField>(field: F, value: TransitionAdjustmentInput[F]) => {
    if (field === 'name')
      announceNameCounter(transitionNameLength(input.name), transitionNameLength(value as string));
    if (field === 'description')
      announceDescriptionCounter(
        transitionDescriptionLength(input.description),
        transitionDescriptionLength(value as string),
      );
    setInput((current) => ({ ...current, [field]: value }));
    setInputErrors((current) => current.filter((error) => error.field !== field));
    if (field === 'name') setNameRefusal(null);
    setNothingAdjusted(false);
  };
  const errorOf = (field: AdjustableTransitionField): string | undefined => {
    if (field === 'name' && nameRefusal) return adjustedTransitionNameRefusalLabel(nameRefusal);
    const error = inputErrors.find((e) => e.field === field);
    return error
      ? transitionFieldErrorLabel(error.code, {
          nameLength: transitionNameLength(input.name),
          descriptionLength: transitionDescriptionLength(input.description),
        })
      : undefined;
  };

  /** « Vérifier les ajustements »: the summary, the errors in the zone, or nothing to adjust. */
  const check = () => {
    const checked = transitionAdjustmentsOf(proposal.transition, input);
    if (!checked.ok) {
      setInputErrors(checked.error);
      setFocus((checked.error[0]?.field as AdjustableTransitionField | undefined) ?? 'name');
      return;
    }
    if (checked.value.length === 0) {
      setNothingAdjusted(true);
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

import {
  contributorLine,
  currentValueLabel,
  decisionLabelsOf,
  proposedPoseOf,
  proposedValueLabel,
  revisionCardLabels,
  validationLabels,
  validatorTextErrorLabel,
  validatorTextLength,
  type KeptDecision,
  type PendingPoseOrRevision,
  type PendingPoseRevision,
  type PoseContent,
  type PoseField,
  type PoseFieldValue,
  type RecordedDecision,
} from '@acrofunjam/core';
import { useId, type Ref } from 'react';
import { PoseDetails } from '../catalog/PoseList';
import { FormAlert, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { AdjustmentForm } from './AdjustmentForm';
import { PoseChangeList } from './PoseChangeList';
import { AdjustmentSummary } from './AdjustmentSummary';
import { DecisionAlert } from './DecisionAlert';
import { useProposalDecision, type Sending } from './useProposalDecision';
import { ValidatorTextCounter } from './ValidatorTextCounter';

/** « Proposée par alice@example.org le 3 novembre 2026 »: the contributor emphasised, the date in a time. */
function ContributorLine({ proposal }: { readonly proposal: PendingPoseOrRevision }) {
  const line = contributorLine(proposal.contributor, proposal.submittedAt);
  // A deleted account has no address to emphasise: « un compte supprimé » is plain text.
  const known = proposal.contributor.isYou || proposal.contributor.email !== null;
  return (
    <p className="proposal-card__contributor">
      {line.before}
      {known ? <strong>{line.contributor}</strong> : line.contributor}
      <time dateTime={proposal.submittedAt.toISOString()}>{line.after}</time>
    </p>
  );
}

/** A value of a pose, as the labels of the presentation take it. */
const valueOf = (pose: PoseContent, field: PoseField) => ({ field, value: pose[field] }) as PoseFieldValue;

/**
 * What a revision changes (carte-modification.md): « Valeur actuelle → valeur proposée » of the changed fields
 * only, then the message of the contributor; it stays in view while the validator adjusts.
 */
function RevisionChanges({ revision }: { readonly revision: PendingPoseRevision }) {
  return (
    <div className="revision-changes">
      <div className="adjustment-summary revision-changes__summary">
        <h3 className="proposal-card__zone-title">{revisionCardLabels.changesTitle}</h3>
        <PoseChangeList
          changes={revision.changes}
          readingKey={revisionCardLabels.changesKey}
          beforeLabel={revisionCardLabels.before}
          afterLabel={revisionCardLabels.after}
        />
      </div>
      {revision.message && (
        <div className="my-proposal__validator-text">
          <p className="my-proposal__validator-text-label">{revisionCardLabels.message}</p>
          <p className="my-proposal__validator-text-content">{revision.message}</p>
        </div>
      )}
    </div>
  );
}

/**
 * A proposal pending validation (docs/design/composants/carte-proposition.md): the pose as the catalog will
 * present it, its contributor, then the decisions, of equal weight; each decision zone opens in the card. A
 * refusal or an incident is told in the card; a recorded decision is handed to the queue, which replaces the
 * card by its report. A revision (carte-modification.md, story 6) is titled « Modification de <nom> » and
 * presents what changes, then the pose after modification.
 */
export function ProposalCard({
  proposal,
  owner,
  kept,
  onDecided,
}: {
  readonly proposal: PendingPoseOrRevision;
  /** Address of the validator the queue was shown to: the owner of the kept input (ADR 0019). */
  readonly owner: string;
  /** The input kept in the tab for this proposal, given back after an expired session or an outage. */
  readonly kept?: KeptDecision | undefined;
  readonly onDecided: (recorded: RecordedDecision) => void;
}) {
  const titleId = useId();
  const decision = useProposalDecision({ proposal, owner, kept, onDecided });
  const { mode, reason, reasonError, note, noteError, alert, sending, refs, closed } = decision;
  const name = proposal.pose.name;
  const labels = decisionLabelsOf(proposal.kind);
  const revision = proposal.kind === 'pose-revision' ? proposal : null;
  const proposed = proposedPoseOf(proposal);
  // « Proposé : … » under each field; for a revision, « Actuellement : … » first, then « Proposé : … » when changed.
  const reminders = (field: PoseField): readonly string[] => {
    const proposedValue = proposedValueLabel(valueOf(proposed, field));
    if (!revision) return [proposedValue];
    const current = currentValueLabel(valueOf(revision.pose, field));
    return revision.changes.some((change) => change.field === field) ? [current, proposedValue] : [current];
  };

  const button = (
    label: string,
    onClick: () => void,
    {
      action,
      busyLabel,
      primary = false,
      ref,
    }: { action?: Sending; busyLabel?: string; primary?: boolean; ref?: Ref<HTMLButtonElement> } = {},
  ) => (
    <button
      ref={ref}
      type="button"
      className={`button ${primary ? 'button--primary' : 'button--secondary'}`}
      aria-disabled={sending !== null || undefined}
      onClick={() => (sending ? undefined : onClick())}
    >
      {action && sending === action ? busyLabel : label}
    </button>
  );
  const acceptButton = button(labels.accept, decision.accept, {
    action: 'accept',
    busyLabel: validationLabels.publishing,
  });

  const reasonLength = validatorTextLength(reason);
  const noteLength = validatorTextLength(note);
  const decisionAlert = alert && (
    <DecisionAlert
      key={decision.attempt}
      alert={alert}
      inputKept={mode !== 'rest'}
      busy={sending !== null}
      onRetry={decision.retry}
      retryRef={refs.retry}
    />
  );

  return (
    <article className="proposal-card" aria-labelledby={titleId}>
      <h2 ref={refs.title} id={titleId} className="proposal-card__name" tabIndex={-1}>
        {/* The space outside the prefix: the accessible name reads « Modification de Throne ». */}
        {revision && (
          <span className="proposal-card__name-prefix">{revisionCardLabels.titlePrefix.trim()}</span>
        )}
        {revision ? ` ${name}` : name}
      </h2>
      <ContributorLine proposal={proposal} />
      {revision && <RevisionChanges revision={revision} />}
      {(closed || mode === 'rest' || mode === 'rejecting') &&
        (revision ? (
          <div className="revision-pose">
            <h3 className="revision-pose__title">{revisionCardLabels.revisedPose}</h3>
            <PoseDetails pose={proposed} tags={proposed.tags} showNoTags />
          </div>
        ) : (
          <PoseDetails pose={proposal.pose} tags={proposal.pose.tags} showNoTags />
        ))}
      <div className="proposal-card__decision">
        {(closed || mode !== 'adjusting') && decisionAlert}
        {!closed && mode === 'rest' && (
          <div className="proposal-card__actions">
            {acceptButton}
            {button(labels.adjust, () => decision.open('adjusting'), { ref: refs.adjust })}
            {button(validationLabels.reject, () => decision.open('rejecting'), { ref: refs.reject })}
          </div>
        )}
        {!closed && mode === 'rejecting' && (
          <div className="proposal-card__zone">
            <TextAreaField
              ref={refs.reason}
              label={validationLabels.reason}
              help={validationLabels.reasonHelp}
              value={reason}
              onChange={(event) => decision.changeReason(event.target.value)}
              counter={<ValidatorTextCounter length={reasonLength} />}
              error={reasonError ? validatorTextErrorLabel(reasonError, reasonLength) : undefined}
            />
            <div className="proposal-card__actions">
              {button(validationLabels.confirmRejection, decision.reject, {
                action: 'reject',
                busyLabel: validationLabels.rejecting,
                primary: true,
              })}
              {button(validationLabels.cancel, decision.cancel)}
            </div>
          </div>
        )}
        {!closed && mode === 'adjusting' && (
          <AdjustmentForm
            title={labels.adjustTitle}
            reminders={reminders}
            input={decision.input}
            onChange={decision.change}
            errorOf={decision.errorOf}
            refs={{
              name: refs.name,
              firstRadios: {
                baseDifficulty: refs.baseDifficulty,
                flyerDifficulty: refs.flyerDifficulty,
                canStartFlow: refs.canStartFlow,
                canEndFlow: refs.canEndFlow,
              },
            }}
            notice={
              decisionAlert ??
              (decision.nothingAdjusted && (
                <FormAlert variant="info">
                  <Icon name="info" />
                  <div className="form-alert__content">
                    <p>{labels.nothingAdjusted}</p>
                    {acceptButton}
                  </div>
                </FormAlert>
              ))
            }
            actions={
              <div className="proposal-card__actions">
                {button(validationLabels.checkAdjustments, decision.check, { primary: true })}
                {button(validationLabels.cancel, decision.cancel)}
              </div>
            }
          />
        )}
        {!closed && mode === 'summary' && (
          <AdjustmentSummary ref={refs.summary} adjustments={decision.adjustments}>
            <TextAreaField
              ref={refs.note}
              label={validationLabels.note}
              help={validationLabels.noteHelp}
              value={note}
              onChange={(event) => decision.changeNote(event.target.value)}
              counter={<ValidatorTextCounter length={noteLength} />}
              error={noteError ? validatorTextErrorLabel(noteError, noteLength) : undefined}
            />
            <div className="proposal-card__actions">
              {button(labels.publishAdjusted, decision.publish, {
                action: 'publish',
                busyLabel: validationLabels.publishing,
                primary: true,
              })}
              {button(validationLabels.editAdjustments, decision.editAdjustments)}
              {button(validationLabels.cancel, decision.cancel)}
            </div>
          </AdjustmentSummary>
        )}
      </div>
    </article>
  );
}

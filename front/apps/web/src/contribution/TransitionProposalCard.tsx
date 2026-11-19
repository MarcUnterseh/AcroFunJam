import {
  contributorLine,
  decisionLabelsOf,
  proposedTagsLabel,
  proposedTransitionValueLabel,
  transitionTagLabels,
  transitionDescriptionLength,
  transitionNameLength,
  transitionProposalLabels,
  validationLabels,
  validatorTextErrorLabel,
  validatorTextLength,
  type KeptDecision,
  type PendingTransitionProposal,
  type RecordedTransitionDecision,
} from '@acrofunjam/core';
import { useId, type Ref } from 'react';
import { Field, FormAlert, TextAreaField } from '../layout/form-controls';
import { Icon } from '../layout/Icon';
import { TagChoiceGroup } from '../layout/tag-parts';
import { DecisionAlert } from './DecisionAlert';
import { DescriptionCounter } from './DescriptionCounter';
import { NameCounter } from './NameCounter';
import { levels } from './pose-choices';
import { TileRadioGroup } from '../layout/TileRadioGroup';
import type { Sending } from './useDecisionCard';
import { useTransitionDecision } from './useTransitionDecision';
import { useTransitionTags } from './useTransitionTags';
import { ValidatorTextCounter } from './ValidatorTextCounter';
import { TransitionAdjustmentList, TransitionDetails, TransitionTitleText } from './TransitionParts';

/**
 * A transition proposal pending validation (docs/design/composants/carte-transition.md): titled by its name and its
 * poses, its contributor, the transition as it will be published, then the decisions of a proposal card. Its
 * adjustment zone has the fields of a transition, never its poses, which the title keeps in view.
 */
export function TransitionProposalCard({
  proposal,
  owner,
  kept,
  onDecided,
}: {
  readonly proposal: PendingTransitionProposal;
  readonly owner: string;
  readonly kept?: KeptDecision | undefined;
  readonly onDecided: (recorded: RecordedTransitionDecision) => void;
}) {
  const titleId = useId();
  const ids = { group: useId(), difficultyHelp: useId() };
  const decision = useTransitionDecision({ proposal, owner, kept, onDecided });
  const tagList = useTransitionTags();
  const { mode, reason, reasonError, input, note, noteError, alert, sending, refs, closed } = decision;
  const labels = decisionLabelsOf(proposal.kind);
  const { transition } = proposal;
  const contributor = contributorLine(proposal.contributor, proposal.submittedAt);
  const known = proposal.contributor.isYou || proposal.contributor.email !== null;

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
      <h2
        ref={refs.title}
        id={titleId}
        className="proposal-card__name proposal-card__name--transition"
        tabIndex={-1}
      >
        <TransitionTitleText
          transition={{ name: transition.name, from: proposal.fromPose.name, to: proposal.toPose.name }}
        />
      </h2>
      <p className="proposal-card__contributor">
        {contributor.before}
        {known ? <strong>{contributor.contributor}</strong> : contributor.contributor}
        <time dateTime={proposal.submittedAt.toISOString()}>{contributor.after}</time>
      </p>
      {(closed || mode === 'rest' || mode === 'rejecting') && (
        <TransitionDetails transition={transition} showNoTags />
      )}
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
          <div className="proposal-card__zone adjustment-form">
            <h3 className="proposal-card__zone-title">{labels.adjustTitle}</h3>
            <p className="proposal-card__zone-introduction">{validationLabels.adjustIntroduction}</p>
            {decisionAlert ??
              (decision.nothingAdjusted && (
                <FormAlert variant="info">
                  <Icon name="info" />
                  <div className="form-alert__content">
                    <p>{labels.nothingAdjusted}</p>
                    {acceptButton}
                  </div>
                </FormAlert>
              ))}
            <Field
              ref={refs.name}
              label={transitionProposalLabels.name}
              autoComplete="off"
              spellCheck={false}
              value={input.name}
              onChange={(event) => decision.change('name', event.target.value)}
              help={proposedTransitionValueLabel({ field: 'name', value: transition.name })}
              counter={<NameCounter length={transitionNameLength(input.name)} />}
              error={decision.errorOf('name')}
            />
            <div className="difficulty-questions">
              <p id={ids.difficultyHelp} className="difficulty-questions__help">
                {transitionProposalLabels.difficultyHelp}
              </p>
              <TileRadioGroup
                legend={transitionProposalLabels.baseDifficulty}
                tone="base"
                name={`${ids.group}-baseDifficulty`}
                layout="levels"
                options={levels}
                value={input.baseDifficulty}
                onChange={(level) => decision.change('baseDifficulty', level)}
                helpId={ids.difficultyHelp}
                help={proposedTransitionValueLabel({
                  field: 'baseDifficulty',
                  value: transition.baseDifficulty,
                })}
                error={decision.errorOf('baseDifficulty')}
                firstRadioRef={refs.baseDifficulty}
              />
              <TileRadioGroup
                legend={transitionProposalLabels.flyerDifficulty}
                tone="flyer"
                name={`${ids.group}-flyerDifficulty`}
                layout="levels"
                options={levels}
                value={input.flyerDifficulty}
                onChange={(level) => decision.change('flyerDifficulty', level)}
                helpId={ids.difficultyHelp}
                help={proposedTransitionValueLabel({
                  field: 'flyerDifficulty',
                  value: transition.flyerDifficulty,
                })}
                error={decision.errorOf('flyerDifficulty')}
                firstRadioRef={refs.flyerDifficulty}
              />
            </div>
            {tagList && (
              <TagChoiceGroup
                list={tagList}
                chosen={input.tags}
                onChange={(tags) => decision.change('tags', tags)}
                legend={transitionTagLabels.legend}
                reminder={proposedTagsLabel(transition.tags)}
                firstBoxRef={refs.tags}
              />
            )}
            <TextAreaField
              ref={refs.description}
              label={transitionProposalLabels.description}
              help={proposedTransitionValueLabel({ field: 'description', value: transition.description })}
              value={input.description}
              onChange={(event) => decision.change('description', event.target.value)}
              counter={<DescriptionCounter length={transitionDescriptionLength(input.description)} />}
              error={decision.errorOf('description')}
            />
            <div className="proposal-card__actions">
              {button(validationLabels.checkAdjustments, decision.check, { primary: true })}
              {button(validationLabels.cancel, decision.cancel)}
            </div>
          </div>
        )}
        {!closed && mode === 'summary' && (
          <div className="proposal-card__zone adjustment-summary">
            <h3 ref={refs.summary} tabIndex={-1} className="proposal-card__zone-title">
              {validationLabels.summaryTitle}
            </h3>
            <TransitionAdjustmentList adjustments={decision.adjustments} />
            <p className="adjustment-summary__rest">{validationLabels.summaryRest}</p>
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
          </div>
        )}
      </div>
    </article>
  );
}

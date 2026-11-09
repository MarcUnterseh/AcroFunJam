import {
  poseNameLength,
  proposalLabels,
  proposedValueLabel,
  validationLabels,
  type PoseProposalInput,
  type ProposalField,
  type ValidPoseProposal,
} from '@acrofunjam/core';
import { useId, type ReactNode, type RefObject } from 'react';
import { Field } from '../layout/form-controls';
import { NameCounter } from './NameCounter';
import { answerOf, answers, levels } from './pose-choices';
import { TileRadioGroup } from './TileRadioGroup';

export type AdjustmentFormRefs = {
  readonly name: RefObject<HTMLInputElement | null>;
  readonly firstRadios: Readonly<Record<Exclude<ProposalField, 'name'>, RefObject<HTMLInputElement | null>>>;
};

/**
 * Zone « Ajuster avant de publier » of a proposal card (carte-proposition.md): the fields of « Proposer une
 * pose », prefilled, each with a reminder of the proposed value (« Proposé : … »), then « Vérifier les
 * ajustements » and « Annuler ». The errors are given by the card, in each field.
 */
export function AdjustmentForm({
  proposed,
  input,
  onChange,
  errorOf,
  notice,
  refs,
  actions,
}: {
  readonly proposed: ValidPoseProposal;
  readonly input: PoseProposalInput;
  readonly onChange: <F extends ProposalField>(field: F, value: PoseProposalInput[F]) => void;
  readonly errorOf: (field: ProposalField) => string | undefined;
  /** Alert at the top of the zone (nothing adjusted, incident). */
  readonly notice: ReactNode;
  readonly refs: AdjustmentFormRefs;
  readonly actions: ReactNode;
}) {
  // Radio names are unique per card: several cards may be adjusted at the same time.
  const ids = { group: useId(), startHelp: useId(), endHelp: useId() };
  const reminder = <F extends keyof ValidPoseProposal>(field: F) =>
    proposedValueLabel({ field, value: proposed[field] } as Parameters<typeof proposedValueLabel>[0]);
  return (
    <div className="proposal-card__zone adjustment-form">
      <h3 className="proposal-card__zone-title">{validationLabels.adjustTitle}</h3>
      <p className="proposal-card__zone-introduction">{validationLabels.adjustIntroduction}</p>
      {notice}
      <Field
        ref={refs.name}
        label={proposalLabels.name}
        autoComplete="off"
        spellCheck={false}
        value={input.name}
        onChange={(event) => onChange('name', event.target.value)}
        help={reminder('name')}
        counter={<NameCounter length={poseNameLength(input.name)} />}
        error={errorOf('name')}
      />
      <TileRadioGroup
        legend={proposalLabels.baseDifficulty}
        name={`${ids.group}-baseDifficulty`}
        layout="levels"
        options={levels}
        value={input.baseDifficulty}
        onChange={(level) => onChange('baseDifficulty', level)}
        help={reminder('baseDifficulty')}
        error={errorOf('baseDifficulty')}
        firstRadioRef={refs.firstRadios.baseDifficulty}
      />
      <TileRadioGroup
        legend={proposalLabels.flyerDifficulty}
        name={`${ids.group}-flyerDifficulty`}
        layout="levels"
        options={levels}
        value={input.flyerDifficulty}
        onChange={(level) => onChange('flyerDifficulty', level)}
        help={reminder('flyerDifficulty')}
        error={errorOf('flyerDifficulty')}
        firstRadioRef={refs.firstRadios.flyerDifficulty}
      />
      <div className="flow-questions">
        <div className="flow-questions__help">
          <p id={ids.startHelp}>{proposalLabels.startFlowHelp}</p>
          <p id={ids.endHelp}>{proposalLabels.endFlowHelp}</p>
        </div>
        <TileRadioGroup
          legend={proposalLabels.canStartFlow}
          name={`${ids.group}-canStartFlow`}
          layout="yes-no"
          options={answers}
          value={answerOf(input.canStartFlow)}
          onChange={(answer) => onChange('canStartFlow', answer === 'yes')}
          helpId={ids.startHelp}
          help={reminder('canStartFlow')}
          error={errorOf('canStartFlow')}
          firstRadioRef={refs.firstRadios.canStartFlow}
        />
        <TileRadioGroup
          legend={proposalLabels.canEndFlow}
          name={`${ids.group}-canEndFlow`}
          layout="yes-no"
          options={answers}
          value={answerOf(input.canEndFlow)}
          onChange={(answer) => onChange('canEndFlow', answer === 'yes')}
          helpId={ids.endHelp}
          help={reminder('canEndFlow')}
          error={errorOf('canEndFlow')}
          firstRadioRef={refs.firstRadios.canEndFlow}
        />
      </div>
      {actions}
    </div>
  );
}

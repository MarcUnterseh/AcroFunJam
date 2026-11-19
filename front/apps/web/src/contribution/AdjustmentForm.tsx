import {
  poseNameLength,
  poseTagLabels,
  proposalLabels,
  validationLabels,
  type PoseField,
  type PoseProposalInput,
  type ProposalField,
} from '@acrofunjam/core';
import { useId, type ReactNode, type RefObject } from 'react';
import { Field } from '../layout/form-controls';
import { NameCounter } from './NameCounter';
import { answerOf, answers, levels } from './pose-choices';
import { TileRadioGroup } from '../layout/TileRadioGroup';
import { TagChoiceGroup } from '../layout/tag-parts';
import { usePoseTags } from './usePoseTags';

export type AdjustmentFormRefs = {
  readonly name: RefObject<HTMLInputElement | null>;
  readonly firstRadios: Readonly<Record<Exclude<ProposalField, 'name'>, RefObject<HTMLInputElement | null>>>;
};

/**
 * Zone « Ajuster avant de publier » of a proposal card (carte-proposition.md), « Ajuster avant d'accepter » of a
 * revision card (carte-modification.md): the fields of « Proposer une pose », prefilled, each with its reminders
 * (« Proposé : … », or « Actuellement : … » then « Proposé : … »), then « Vérifier les ajustements » and
 * « Annuler ». The errors are given by the card, in each field.
 */
export function AdjustmentForm({
  title,
  reminders,
  input,
  onChange,
  errorOf,
  notice,
  refs,
  actions,
}: {
  readonly title: string;
  /** The reminders under the label or the legend of each field. */
  readonly reminders: (field: PoseField) => readonly string[];
  readonly input: PoseProposalInput;
  readonly onChange: <F extends keyof PoseProposalInput>(field: F, value: PoseProposalInput[F]) => void;
  readonly errorOf: (field: ProposalField) => string | undefined;
  /** Alert at the top of the zone (nothing adjusted, incident). */
  readonly notice: ReactNode;
  readonly refs: AdjustmentFormRefs;
  readonly actions: ReactNode;
}) {
  // Radio names are unique per card: several cards may be adjusted at the same time.
  const ids = { group: useId(), startHelp: useId(), endHelp: useId() };
  const reminder = reminders;
  // Story 9a: the tags of the list that apply to poses (the adjustment of the tags, 9a-etiquettes-des-poses.md § 6).
  const tagList = usePoseTags();
  return (
    <div className="proposal-card__zone adjustment-form">
      <h3 className="proposal-card__zone-title">{title}</h3>
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
        tone="base"
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
        tone="flyer"
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
      {tagList && tagList.length > 0 && (
        <TagChoiceGroup
          list={tagList}
          chosen={input.tags}
          onChange={(tags) => onChange('tags', tags)}
          legend={poseTagLabels.revisionLegend}
          reminder={reminder('tags').join(' ')}
        />
      )}
      {actions}
    </div>
  );
}

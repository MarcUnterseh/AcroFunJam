import {
  chosenTagsCountLabel,
  difficultyLevelName,
  difficultyScale,
  flowGenerationLabels as labels,
  flowLengths,
  tagCriterionOf,
  toggleTag,
  transitionTagLabels,
  type DifficultyLevel,
  type FlowCriteria,
  type Tag,
  type TagCriterion,
} from '@acrofunjam/core';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../layout/Icon';
import { TagMeanings } from '../layout/tag-parts';
import { TileRadioGroup } from '../layout/TileRadioGroup';

const levelOptions = difficultyScale.map((level) => ({
  value: level,
  label: difficultyLevelName(level),
  phase: level,
}));

/** « Nombre de transitions »: a native list from 1 to 10, its help between the label and the list (champ.md). */
function LengthField({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (length: number) => void;
}) {
  const id = useId();
  return (
    <div className="field generator__count-field">
      <label htmlFor={id}>{labels.length}</label>
      <p id={`${id}-aide`} className="field__help">
        {labels.lengthHelp}
      </p>
      <div className="field__select">
        <select
          id={id}
          aria-describedby={`${id}-aide`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {flowLengths.map((length) => (
            <option key={length} value={length}>
              {length}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" />
      </div>
    </div>
  );
}

/**
 * A group of tags of the generator: every tag of the list, as pills; a tag chosen in the other group is disabled there,
 * with « (demandée) » or « (exclue) » in its pill and in its name (groupe-cases-pastilles.md, état désactivée).
 */
function TagCriterionGroup({
  criterion,
  tags,
  criteria,
  onChange,
}: {
  readonly criterion: TagCriterion;
  readonly tags: readonly Tag[];
  readonly criteria: FlowCriteria;
  readonly onChange: (criteria: FlowCriteria) => void;
}) {
  const helpId = useId();
  const [legend, help] =
    criterion === 'requested'
      ? [labels.requested, labels.requestedHelp]
      : [labels.excluded, labels.excludedHelp];
  return (
    <fieldset className="tag-choice" aria-describedby={helpId}>
      <legend className="tag-choice__legend">{legend}</legend>
      <p id={helpId} className="tag-choice__help">
        {help}
      </p>
      <div className="tag-choice__boxes">
        {tags.map((tag) => {
          const chosenIn = tagCriterionOf(criteria, tag.id);
          const disabled = chosenIn !== null && chosenIn !== criterion;
          return (
            <label key={tag.id} className={`tag-choice__box${disabled ? ' tag-choice__box--disabled' : ''}`}>
              <input
                type="checkbox"
                name={criterion === 'requested' ? 'avec' : 'sans'}
                value={tag.id}
                checked={chosenIn === criterion}
                disabled={disabled}
                onChange={() => onChange(toggleTag(criteria, criterion, tag.id))}
              />
              {tag.name}
              {disabled && (
                <>
                  {' '}
                  <span className="tag-choice__state">
                    {chosenIn === 'requested' ? labels.requestedMark : labels.excludedMark}
                  </span>
                </>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The fold « Étiquettes (facultatives) » (repli-criteres-etiquettes.md), closed unless a tag must be checked again. */
function TagsFold({
  tags,
  criteria,
  onChange,
  open,
}: {
  readonly tags: readonly Tag[];
  readonly criteria: FlowCriteria;
  readonly onChange: (criteria: FlowCriteria) => void;
  readonly open: boolean;
}) {
  const count = chosenTagsCountLabel(criteria.requestedTagIds.length + criteria.excludedTagIds.length);
  return (
    <details className="criteria-fold" open={open || undefined}>
      <summary className="criteria-fold__summary">
        <span>{labels.tags}</span>
        {count && <span className="criteria-fold__count">{count}</span>}
        <Icon name="chevronDown" />
      </summary>
      <div className="criteria-fold__content">
        <TagCriterionGroup criterion="requested" tags={tags} criteria={criteria} onChange={onChange} />
        <TagCriterionGroup criterion="excluded" tags={tags} criteria={criteria} onChange={onChange} />
        <TagMeanings tags={tags} summary={transitionTagLabels.listMeanings} />
      </div>
    </details>
  );
}

/**
 * The form of the generator (9-generer-un-flow.md § 2): length, two ceilings, the fold of the tags, then « Générer un
 * flow ». The criteria are those of the address; the alert of a refusal sits above the first field.
 */
export function FlowGeneratorForm({
  initial,
  tags,
  tagsFailed,
  alert,
  tagsOpen,
  generating,
  onGenerate,
}: {
  readonly initial: FlowCriteria;
  /** The tags of the list, without those the API said are no longer in it. */
  readonly tags: readonly Tag[];
  readonly tagsFailed: boolean;
  readonly alert: ReactNode;
  readonly tagsOpen: boolean;
  readonly generating: boolean;
  readonly onGenerate: (criteria: FlowCriteria) => void;
}) {
  const [criteria, setCriteria] = useState(initial);
  const helpId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!generating) onGenerate(criteria);
  };
  const ceiling = (key: 'baseCeiling' | 'flyerCeiling') => (level: DifficultyLevel) =>
    setCriteria({ ...criteria, [key]: level });
  return (
    <form className="generator__form" noValidate onSubmit={submit}>
      {alert}
      <LengthField value={criteria.length} onChange={(length) => setCriteria({ ...criteria, length })} />
      <div className="difficulty-questions">
        <p id={helpId} className="difficulty-questions__help">
          {labels.ceilingsHelp}
        </p>
        <TileRadioGroup
          legend={labels.baseCeiling}
          name="base"
          options={levelOptions}
          value={criteria.baseCeiling}
          onChange={ceiling('baseCeiling')}
          helpId={helpId}
          layout="levels"
          tone="base"
        />
        <TileRadioGroup
          legend={labels.flyerCeiling}
          name="flyer"
          options={levelOptions}
          value={criteria.flyerCeiling}
          onChange={ceiling('flyerCeiling')}
          helpId={helpId}
          layout="levels"
          tone="flyer"
        />
      </div>
      {tagsFailed ? (
        <p className="tag-choice__note">
          <Icon name="info" />
          <span>{labels.tagsNotLoaded}</span>
        </p>
      ) : (
        tags.length > 0 && <TagsFold tags={tags} criteria={criteria} onChange={setCriteria} open={tagsOpen} />
      )}
      <div className="form-actions">
        <button type="submit" className="button button--primary" aria-disabled={generating || undefined}>
          {generating ? labels.generating : labels.generate}
        </button>
      </div>
    </form>
  );
}

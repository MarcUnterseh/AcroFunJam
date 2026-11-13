import type { DifficultyLevel } from '@acrofunjam/core';
import { useId, type Ref } from 'react';
import { DifficultyMoon } from '../catalog/DifficultyMoon';
import { helpIds, helpsOf, ModifiedTag, type Help } from '../layout/form-controls';
import { Icon } from '../layout/Icon';

export type TileOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  /** A difficulty level: the tile shows its moon phase above the label (groupe-tuiles-radio.md, « Phases »). */
  readonly phase?: DifficultyLevel;
};

type TileRadioGroupProps<T extends string> = {
  readonly legend: string;
  readonly name: string;
  readonly options: readonly TileOption<T>[];
  /** null: nothing chosen (no option is preselected). */
  readonly value: T | null;
  readonly onChange: (value: T) => void;
  readonly error?: string | undefined;
  /** Id of a help shared with other groups (the help of the flow questions). */
  readonly helpId?: string | undefined;
  /**
   * Help of this group, between the legend and the error (« Proposée : Débutant », story 4), or several
   * (« Actuellement : Intermédiaire », then « Proposée : Découverte », story 6).
   */
  readonly help?: Help;
  /** « Modifiée »: the value differs from the current one (story 6). */
  readonly tag?: string | undefined;
  /** Receives the first radio, to give it the focus when the group is the first one in error. */
  readonly firstRadioRef?: Ref<HTMLInputElement> | undefined;
  readonly layout: 'levels' | 'yes-no';
  /** The role the group is about: a checked tile takes its colour (« Base » earth, « Flyer » sky). */
  readonly tone?: 'base' | 'flyer' | undefined;
};

/**
 * Group of radio tiles (docs/design/composants/groupe-tuiles-radio.md): native radios in a fieldset, each tile a
 * label wrapping its radio. The error sits between the legend and the tiles, described by the fieldset and by
 * every radio (aria-invalid is not supported on a fieldset).
 */
export function TileRadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  helpId,
  help,
  tag,
  firstRadioRef,
  layout,
  tone,
}: TileRadioGroupProps<T>) {
  const errorId = useId();
  const ownId = useId();
  const tagId = `${ownId}-etiquette`;
  const helps = helpsOf(help);
  const ownHelpIds = helpIds(ownId, help);
  const describedBy =
    [tag && tagId, helpId, ...ownHelpIds, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset
      className={`tile-group${tone ? ` tile-group--${tone}` : ''}${error ? ' tile-group--invalid' : ''}`}
      aria-describedby={describedBy}
    >
      <legend className={tag ? 'tile-group__legend--tagged' : undefined}>
        {legend}
        {tag && <ModifiedTag id={tagId} text={tag} />}
      </legend>
      {helps.map((text, index) => (
        <p key={ownHelpIds[index]} id={ownHelpIds[index]} className="tile-group__help">
          {text}
        </p>
      ))}
      {error && (
        <p id={errorId} className="field__error tile-group__error">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
      {/* The container of the tiles carries the container query (not the fieldset, whose rendering varies). */}
      <div className="tile-group__container">
        <div className={`tile-group__tiles tile-group__tiles--${layout}`}>
          {options.map((option, index) => (
            <label key={option.value} className={`tile${option.phase ? ' tile--phase' : ''}`}>
              <input
                ref={index === 0 ? firstRadioRef : undefined}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
              />
              {option.phase && <DifficultyMoon level={option.phase} />}
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

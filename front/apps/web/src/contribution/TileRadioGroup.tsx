import { useId, type Ref } from 'react';
import { Icon } from '../layout/Icon';

export type TileOption<T extends string> = { readonly value: T; readonly label: string };

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
  /** Receives the first radio, to give it the focus when the group is the first one in error. */
  readonly firstRadioRef?: Ref<HTMLInputElement> | undefined;
  readonly layout: 'levels' | 'yes-no';
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
  firstRadioRef,
  layout,
}: TileRadioGroupProps<T>) {
  const errorId = useId();
  const describedBy = [helpId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset className={`tile-group${error ? ' tile-group--invalid' : ''}`} aria-describedby={describedBy}>
      <legend>{legend}</legend>
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
            <label key={option.value} className="tile">
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
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

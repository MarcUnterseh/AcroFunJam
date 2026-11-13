import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';

/** One help, or several (« Actuellement : Throne », then « 60 caractères au maximum. »), each in its paragraph. */
export type Help = string | readonly string[] | undefined;

export const helpsOf = (help: Help): readonly string[] =>
  help === undefined ? [] : typeof help === 'string' ? [help] : help;

/** The ids of the helps of a field, in order: « <id>-aide », « <id>-aide-2 »… */
export const helpIds = (id: string, help: Help): string[] =>
  helpsOf(help).map((_, index) => (index === 0 ? `${id}-aide` : `${id}-aide-${index + 1}`));

/**
 * Tag « Modifiée » in a label or a legend (docs/design/composants/etiquette-modifiee.md): hidden from the
 * accessible name, read in the description instead (the field refers to it first).
 */
export function ModifiedTag({ id, text }: { readonly id: string; readonly text: string }) {
  return (
    <span id={id} className="modified-tag" aria-hidden="true">
      {text}
    </span>
  );
}

type FieldProps = {
  readonly label: string;
  readonly help?: Help;
  readonly error?: string | undefined;
  /** « Modifiée »: the value differs from the current one (story 6). */
  readonly tag?: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'aria-describedby'>;

/**
 * Visible label, then help, counter and error, linked by aria-describedby (docs/design/composants/champ.md).
 * The counter is not part of the description: it is announced by the form only when it matters.
 */
export const Field = forwardRef<
  HTMLInputElement,
  FieldProps & { readonly trailing?: ReactNode; readonly counter?: ReactNode }
>(function Field({ label, help, error, tag, trailing, counter, id, ...input }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  const helps = helpsOf(help);
  const helpIdsOfField = helpIds(inputId, help);
  const tagId = `${inputId}-etiquette`;
  const describedBy =
    [tag && tagId, ...helpIdsOfField, error && `${inputId}-erreur`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={inputId} className={tag ? 'field__label--tagged' : undefined}>
        {label}
        {tag && <ModifiedTag id={tagId} text={tag} />}
      </label>
      <div className="field__control">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        {trailing}
      </div>
      {helps.map((text, index) => (
        <p key={helpIdsOfField[index]} id={helpIdsOfField[index]} className="field__help">
          {text}
        </p>
      ))}
      {counter}
      {error && (
        <p id={`${inputId}-erreur`} className="field__error">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

type TextAreaFieldProps = {
  readonly label: string;
  readonly help?: string | undefined;
  readonly error?: string | undefined;
  readonly counter?: ReactNode;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid' | 'aria-describedby'>;

/**
 * Text area variant of the field (docs/design/composants/champ.md, « Variante zone de texte »): 4 lines, same
 * label, help, counter and error as a field, linked the same way.
 */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, help, error, counter, id, ...textarea },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy =
    [help && `${fieldId}-aide`, error && `${fieldId}-erreur`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <textarea
        ref={ref}
        id={fieldId}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...textarea}
      />
      {help && (
        <p id={`${fieldId}-aide`} className="field__help">
          {help}
        </p>
      )}
      {counter}
      {error && (
        <p id={`${fieldId}-erreur`} className="field__error">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

type SelectFieldProps = {
  readonly label: string;
  readonly error?: string | undefined;
  /** The empty option, first, selected by default; not disabled: the person may come back to it (champ.md). */
  readonly emptyOption: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'aria-invalid' | 'aria-describedby' | 'children'>;

/**
 * Drop-down list variant of the field (docs/design/composants/champ.md, « Variante liste déroulante », story 7): a
 * native select, for its accessibility and the typed letters, its chevron drawn above it; label and error linked as
 * for a field.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, emptyOption, options, id, ...select },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="field__select">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-erreur` : undefined}
          {...select}
        >
          <option value="">{emptyOption}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" />
      </div>
      {error && (
        <p id={`${fieldId}-erreur`} className="field__error">
          <Icon name="error" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

/** Password field with a "show password" toggle (docs/design/composants/champ-mot-de-passe.md). */
export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        // The accessible name contains the visible text (WCAG 2.5.3): "Afficher / Masquer le mot de passe".
        <button
          type="button"
          className="field__toggle"
          aria-label={`${visible ? 'Masquer' : 'Afficher'} le mot de passe`}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Masquer' : 'Afficher'}
        </button>
      }
    />
  );
});

/**
 * Alert at the top of a form for a refusal coming from the API (role="alert", the focus stays put, unless the
 * element that had it disappeared: the alert may then take it, tabIndex -1).
 * Information variant: nothing went wrong on the person's side (expired session, input kept).
 */
export const FormAlert = forwardRef<
  HTMLDivElement,
  { readonly variant?: 'error' | 'info'; readonly children: ReactNode }
>(function FormAlert({ variant = 'error', children }, ref) {
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={ref ? -1 : undefined}
      className={`form-alert${variant === 'info' ? ' form-alert--info' : ''}`}
    >
      {children}
    </div>
  );
});

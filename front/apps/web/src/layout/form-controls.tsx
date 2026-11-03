import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './Icon';

type FieldProps = {
  readonly label: string;
  readonly help?: string | undefined;
  readonly error?: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'aria-describedby'>;

/**
 * Visible label, then help, counter and error, linked by aria-describedby (docs/design/composants/champ.md).
 * The counter is not part of the description: it is announced by the form only when it matters.
 */
export const Field = forwardRef<
  HTMLInputElement,
  FieldProps & { readonly trailing?: ReactNode; readonly counter?: ReactNode }
>(function Field({ label, help, error, trailing, counter, id, ...input }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  const describedBy =
    [help && `${inputId}-aide`, error && `${inputId}-erreur`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
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
      {help && (
        <p id={`${inputId}-aide`} className="field__help">
          {help}
        </p>
      )}
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
 * Alert at the top of a form for a refusal coming from the API (role="alert", the focus stays put).
 * Information variant: nothing went wrong on the person's side (expired session, input kept).
 */
export function FormAlert({
  variant = 'error',
  children,
}: {
  readonly variant?: 'error' | 'info';
  readonly children: ReactNode;
}) {
  return (
    <div role="alert" className={`form-alert${variant === 'info' ? ' form-alert--info' : ''}`}>
      {children}
    </div>
  );
}

import {
  identityErrorLabel,
  passwordRequirementLabel,
  type FieldError,
  type IdentityError,
  type Result,
  type Session,
} from '@acrofunjam/core';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAnnounce } from '../layout/Announcer';
import { Icon } from '../layout/Icon';
import { Field, FormAlert, PasswordField } from './form-controls';
import { safeReturnPath } from './return-path';
import { useSession } from './SessionContext';

type Kind = 'sign-in' | 'registration';

const texts = {
  'sign-in': {
    title: 'Se connecter',
    submit: 'Se connecter',
    busy: 'Connexion…',
    success: 'Connexion réussie.',
    switchText: 'Pas encore de compte ?',
    switchLink: "S'inscrire",
    switchPath: '/inscription',
  },
  registration: {
    title: "S'inscrire",
    submit: 'Créer mon compte',
    busy: 'Création du compte…',
    success: 'Compte créé. Bienvenue sur AcroFunJam !',
    switchText: 'Déjà un compte ?',
    switchLink: 'Se connecter',
    switchPath: '/connexion',
  },
} as const;

type Refusal =
  | { readonly kind: 'message'; readonly message: string; readonly canRetry: boolean }
  | { readonly kind: 'registered-but-not-signed-in' };

const refusalOf = (error: IdentityError): Refusal | null => {
  if (error.kind === 'refused')
    return {
      kind: 'message',
      message: identityErrorLabel(error.reason),
      canRetry: error.reason === 'unreachable',
    };
  if (error.kind === 'registered-but-not-signed-in') return { kind: 'registered-but-not-signed-in' };
  return null;
};

/** The "Se connecter" and "S'inscrire" pages: same fields, same states (docs/design/ecrans/2b-…). */
export function IdentityForm({
  kind,
  onSubmit,
}: {
  kind: Kind;
  onSubmit: (input: { email: string; password: string }) => Promise<Result<Session, IdentityError>>;
}) {
  const text = texts[kind];
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<readonly FieldError[]>([]);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const succeeded = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const announce = useAnnounce();
  const returnPath = safeReturnPath(params.get('retour'));
  const retourParam = `?retour=${encodeURIComponent(returnPath)}`;

  useEffect(() => {
    document.title = `${text.title} – AcroFunJam`;
  }, [text.title]);

  // Already signed in (and not because of this form): nothing to do here, go back.
  if (session.status === 'signedIn' && !succeeded.current) return <Navigate to={returnPath} replace />;

  const errorOf = (field: FieldError['field']) => {
    const error = fieldErrors.find((e) => e.field === field);
    return error ? identityErrorLabel(error.code) : undefined;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting.current) return; // no double submission, even before the next render
    submitting.current = true;
    setBusy(true);
    setRefusal(null); // a refusal identical to the previous one is announced again
    const result = await onSubmit({ email, password });
    submitting.current = false;
    setBusy(false);
    setAttempt((n) => n + 1);
    if (result.ok) {
      succeeded.current = true;
      announce(text.success);
      void navigate(returnPath);
      return;
    }
    if (result.error.kind === 'invalid-input') {
      setFieldErrors(result.error.errors);
      (result.error.errors[0]?.field === 'email' ? emailRef : passwordRef).current?.focus();
      return;
    }
    setFieldErrors([]);
    setRefusal(refusalOf(result.error));
  };

  return (
    <section className="identity-page">
      <h1 tabIndex={-1}>{text.title}</h1>
      <form aria-label={text.title} noValidate onSubmit={(event) => void submit(event)}>
        {refusal && (
          <FormAlert key={attempt}>
            <Icon name="error" />
            {refusal.kind === 'message' ? (
              <div>
                <p>{refusal.message}</p>
                {refusal.canRetry && (
                  <button type="button" className="button button--secondary" onClick={() => void submit()}>
                    Réessayer
                  </button>
                )}
              </div>
            ) : (
              <p>
                Ton compte est créé, mais la connexion n'a pas pu aboutir.{' '}
                <Link to={`/connexion${retourParam}`}>Se connecter</Link>
              </p>
            )}
          </FormAlert>
        )}
        <Field
          ref={emailRef}
          label="Adresse e-mail"
          name="email"
          type="email"
          autoComplete={kind === 'sign-in' ? 'username' : 'email'}
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorOf('email')}
        />
        <PasswordField
          ref={passwordRef}
          label="Mot de passe"
          name="password"
          autoComplete={kind === 'sign-in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          help={kind === 'registration' ? passwordRequirementLabel : undefined}
          error={errorOf('password')}
        />
        <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
          {busy ? text.busy : text.submit}
        </button>
      </form>
      <p className="identity-page__switch">
        {text.switchText} <Link to={`${text.switchPath}${retourParam}`}>{text.switchLink}</Link>
      </p>
    </section>
  );
}

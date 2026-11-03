import { fail, ok, type Result } from '../common/result';

/** E-mail address of an account, trimmed. */
export type EmailAddress = string & { readonly __brand: 'EmailAddress' };

export type FieldErrorCode =
  | 'identity.email-required'
  | 'identity.email-invalid'
  | 'identity.password-required'
  | 'identity.password-too-short';

export type FieldError = { readonly field: 'email' | 'password'; readonly code: FieldErrorCode };

export type Credentials = { readonly email: EmailAddress; readonly password: string };

/** Same rule as the API (ADR 0011): length over composition, pass phrases allowed. */
export const passwordPolicy = { minLength: 10 } as const;

/**
 * Same rule as the API's EmailAddressAttribute: exactly one "@", neither first nor last.
 * Never stricter, or the site would block accounts the API accepts.
 */
export const createEmailAddress = (raw: string): Result<EmailAddress, FieldErrorCode> => {
  const value = raw.trim();
  if (value === '') return fail('identity.email-required');
  const at = value.indexOf('@');
  const valid = at > 0 && at === value.lastIndexOf('@') && at < value.length - 1;
  return valid ? ok(value as EmailAddress) : fail('identity.email-invalid');
};

type Input = { readonly email: string; readonly password: string };

const validate = (
  input: Input,
  passwordError: (password: string) => FieldErrorCode | null,
): Result<Credentials, FieldError[]> => {
  const errors: FieldError[] = [];
  const email = createEmailAddress(input.email);
  if (!email.ok) errors.push({ field: 'email', code: email.error });
  const password = passwordError(input.password);
  if (password) errors.push({ field: 'password', code: password });
  return email.ok && errors.length === 0
    ? ok({ email: email.value, password: input.password })
    : fail(errors);
};

/** Registration: the password must follow the policy. The password is never trimmed nor truncated. */
export const validateRegistration = (input: Input): Result<Credentials, FieldError[]> =>
  validate(input, (password) => {
    if (password === '') return 'identity.password-required';
    // Length counted in UTF-16 code units, like string.Length on the API side.
    return password.length < passwordPolicy.minLength ? 'identity.password-too-short' : null;
  });

/** Sign-in: only presence is checked (an old password may predate the current policy). */
export const validateSignIn = (input: Input): Result<Credentials, FieldError[]> =>
  validate(input, (password) => (password === '' ? 'identity.password-required' : null));

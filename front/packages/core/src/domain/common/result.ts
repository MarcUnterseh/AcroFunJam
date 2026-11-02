/** Expected business error, with a stable code `<context>.<rule>` (same codes as the API). */
export type DomainError = { readonly code: string; readonly message: string };

/** Outcome of a business operation: a value, or an expected business error. */
export type Result<T, E = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isSuccess = <T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } =>
  result.ok;

export const isFailure = <T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } =>
  !result.ok;

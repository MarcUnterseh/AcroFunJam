/** A kept input and its owner: the address of the session it was typed in. */
export type KeptInput<T> = { readonly owner: string; readonly input: T };

/**
 * Port: the input of a form kept in the tab (glossary « Saisie conservée », ADR 0019), by key (the pose of the form):
 * the person finds it again on the form of the same key after an expired session or an outage. Not a proposal.
 * Implemented by the site on sessionStorage; every method must be safe when the storage is unavailable.
 */
export interface KeyedInputStore<T> {
  load(key: string): KeptInput<T> | null;
  save(key: string, kept: KeptInput<T>): void;
  clear(key: string): void;
}

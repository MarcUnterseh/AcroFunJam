import type { ChoosableTag, TagReference } from '@acrofunjam/core';

// Reading the tags of a transition (story 8, ADR 0034), shared by the Catalog and Contribution adapters. The generated
// types describe the contract, but the server may evolve before the client is regenerated: every value is checked,
// null when it cannot be read.

const isString = (value: unknown): value is string => typeof value === 'string';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Every item read, or null when one cannot be. */
export const everyItem = <T>(value: unknown, read: (item: unknown) => T | null): T[] | null => {
  if (!Array.isArray(value)) return null;
  const items = value.map(read);
  return items.every((item) => item !== null) ? (items as T[]) : null;
};

/** A tag by its identifier and its current name. */
export const toTagReference = (value: unknown): TagReference | null =>
  isRecord(value) && isString(value['id']) && isString(value['name'])
    ? { id: value['id'], name: value['name'] }
    : null;

/** A tag of the list (GET /catalog/tags), as offered to choose: its description and the tag it adds. */
export const toChoosableTag = (value: unknown): ChoosableTag | null => {
  const tag = toTagReference(value);
  if (!tag || !isRecord(value)) return null;
  const { description, impliedTagId } = value;
  if (!isString(description) || !(impliedTagId === null || isString(impliedTagId))) return null;
  return { ...tag, description, impliedTagId };
};

/** The tags of the list, from the answer of GET /catalog/tags. */
export const toChoosableTags = (data: unknown): ChoosableTag[] | null =>
  isRecord(data) ? everyItem(data['tags'], toChoosableTag) : null;

/** The identifiers of the tags no longer in the list, in the extensions of the refusal (ADR 0034). */
export const tagIdsOf = (problem: unknown): string[] =>
  isRecord(problem) && Array.isArray(problem['tagIds']) ? problem['tagIds'].filter(isString) : [];

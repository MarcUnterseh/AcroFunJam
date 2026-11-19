/**
 * The tags of a transition (story 8, ADR 0032, ADR 0034) and of a pose (story 9a, ADR 0036), shared by the Catalog (tagging
 * a published element) and Contribution (proposing, adjusting): each context reads the list through its own port, but the
 * rule of choice is one.
 */

import type { TagScope } from './tag-scope';

/** A tag designated by its identifier and its current name. */
export type TagReference = { readonly id: string; readonly name: string };

/**
 * A tag of the list, as offered to choose: its description, the tag it adds (« dynamique » for « pop ») and what it applies
 * to (story 9a, ADR 0035).
 */
export type ChoosableTag = TagReference & {
  readonly description: string;
  readonly impliedTagId: string | null;
  readonly scope: TagScope;
};

/**
 * The tags carried once chosen, in the order of the list: the chosen ones and the ones they add (« pop » adds
 * « dynamique »: unchecking « dynamique » while « pop » stays chosen keeps it). A tag no longer in the list is left out.
 */
export const withImpliedTags = (
  list: readonly ChoosableTag[],
  chosenIds: readonly string[],
): TagReference[] => {
  const chosen = new Set(chosenIds);
  for (const tag of list) if (chosen.has(tag.id) && tag.impliedTagId) chosen.add(tag.impliedTagId);
  return list.filter((tag) => chosen.has(tag.id)).map(({ id, name }) => ({ id, name }));
};

/** The tags of the list adding this one (« pop », « whip » and « icarien » add « dynamique »), in the order of the list. */
export const tagsImplying = (list: readonly ChoosableTag[], tagId: string): ChoosableTag[] =>
  list.filter((tag) => tag.impliedTagId === tagId);

/** The same set of tags, whatever their order (a set: the order is the catalog's). */
export const sameTags = (a: readonly TagReference[], b: readonly TagReference[]): boolean => {
  const ids = new Set(a.map((tag) => tag.id));
  return ids.size === new Set(b.map((tag) => tag.id)).size && b.every((tag) => ids.has(tag.id));
};

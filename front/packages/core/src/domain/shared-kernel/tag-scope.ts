/**
 * What a tag applies to (story 9a, ADR 0035): the poses, the transitions or both; chosen when it is added. Shared by the
 * Catalog (the list of tags, tagging a pose or a transition) and Contribution (choosing the tags of a proposal).
 */
export type TagScope = 'poses' | 'transitions' | 'poses-and-transitions';

export const tagScopes: readonly TagScope[] = ['poses', 'transitions', 'poses-and-transitions'];

export const tagAppliesToPoses = (tag: { readonly scope: TagScope }): boolean => tag.scope !== 'transitions';

export const tagAppliesToTransitions = (tag: { readonly scope: TagScope }): boolean => tag.scope !== 'poses';

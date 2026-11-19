import type { Tag } from '../../domain/catalog/tag';
import { tagAppliesToPoses, tagAppliesToTransitions } from '../../domain/shared-kernel/tag-scope';

// Story 9a (ADR 0035): the tags of the list offered to tag a published pose or transition, in the order of the list.

/** The tags of the list that apply to poses: those offered in the zone « Étiquettes de la pose ». */
export const poseTagChoices = (tags: readonly Tag[]): Tag[] => tags.filter(tagAppliesToPoses);

/** The tags of the list that apply to transitions: those offered in the zone « Étiqueter » of a transition. */
export const transitionTagChoices = (tags: readonly Tag[]): Tag[] => tags.filter(tagAppliesToTransitions);

import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import type { TagReference } from '../shared-kernel/transition-tags';
import type { PoseSummary } from './pose-summary';

/** A published pose designated by a transition, under its current name in the catalog (story 7). */
export type PoseReference = { readonly id: string; readonly name: string };

/** A tag carried by a published transition, with its description, read in the fold of the transition (story 8). */
export type TransitionTag = TagReference & { readonly description: string };

/**
 * A published transition, as the page of one of its poses presents it (glossary « Page d'une pose », ADR 0030): the
 * other pose (the arrival pose among the transitions from the page, the departure pose among those to it), its
 * optional name, its two difficulties (the passage alone) and its optional public description.
 */
export type LinkedTransition = {
  readonly id: string;
  readonly otherPose: PoseReference;
  /** null: a transition without a name, presented by its poses (« Throne → Bird »). */
  readonly name: string | null;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly description: string | null;
  /** Story 8: its tags under their current names, in catalog order (none: an empty list). */
  readonly tags: readonly TransitionTag[];
};

/**
 * The page of a published pose: the pose, then the transitions from it and to it, in catalog order (on the other
 * pose, then on the name, the transitions without a name first: the order is guaranteed by the API).
 */
export type PosePage = PoseSummary & {
  readonly transitionsFrom: readonly LinkedTransition[];
  readonly transitionsTo: readonly LinkedTransition[];
};

/** A washing machine: the transition comes back to the pose of the page; it appears in both of its sections. */
export const isSamePose = (page: Pick<PosePage, 'id'>, transition: LinkedTransition): boolean =>
  transition.otherPose.id === page.id;

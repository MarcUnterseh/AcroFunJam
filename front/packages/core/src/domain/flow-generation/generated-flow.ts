import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import type { TagReference } from '../shared-kernel/tags';

/** A pose of a generated flow: its name, its two difficulties and its tags, in catalog order. */
export type FlowPose = {
  readonly id: string;
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly tags: readonly TagReference[];
};

/** A transition of a generated flow; without a name, it is presented by its poses (« Throne → Bird »). */
export type FlowTransition = {
  readonly id: string;
  readonly name: string | null;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly description: string | null;
  readonly tags: readonly TagReference[];
};

/** A step: its number (from 1), its transition, whether it is a washing machine, and its arrival pose (G3). */
export type FlowStep = {
  readonly number: number;
  readonly transition: FlowTransition;
  readonly isWashingMachine: boolean;
  readonly arrival: FlowPose;
};

/** A generated flow (story 9): its start pose, then its steps, in order. Nothing is recorded. */
export type GeneratedFlow = { readonly start: FlowPose; readonly steps: readonly FlowStep[] };

/** The pose the flow ends on: the arrival of its last step. */
export const endPose = (flow: GeneratedFlow): FlowPose => flow.steps.at(-1)?.arrival ?? flow.start;

/** The same flow: the same start pose, then the same transitions in the same order (« Générer un autre flow », Q196). */
export const sameFlow = (a: GeneratedFlow, b: GeneratedFlow): boolean =>
  a.start.id === b.start.id &&
  a.steps.length === b.steps.length &&
  a.steps.every((step, index) => step.transition.id === b.steps[index]?.transition.id);

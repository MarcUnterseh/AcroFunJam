import { fail, ok, type Result } from '../common/result';
import { sameTags } from '../shared-kernel/transition-tags';
import {
  validateTransitionContent,
  type TransitionContent,
  type TransitionFieldError,
  type TransitionProposalInput,
} from './transition-proposal';

/**
 * The fields of a transition a validator may adjust, in the order of the form: never its poses (story 7); its tags
 * after the difficulties (story 8).
 */
export const adjustableTransitionFields = [
  'name',
  'baseDifficulty',
  'flyerDifficulty',
  'tags',
  'description',
] as const;

export type AdjustableTransitionField = (typeof adjustableTransitionFields)[number];

/**
 * A value of a transition the validator changed before accepting (glossary « Ajustement »): proposed → retained. A
 * name or a description may be given, corrected or removed (null).
 */
export type TransitionAdjustment = {
  [F in AdjustableTransitionField]: {
    readonly field: F;
    readonly proposed: TransitionContent[F];
    readonly retained: TransitionContent[F];
  };
}[AdjustableTransitionField];

/** What the validator typed in the adjustment zone of a transition card. */
export type TransitionAdjustmentInput = Pick<
  TransitionProposalInput,
  'name' | 'baseDifficulty' | 'flyerDifficulty' | 'description' | 'tags'
>;

/** The zone opens on the proposed values; an absent name or description is an empty field. */
export const transitionAdjustmentInputOf = (content: TransitionContent): TransitionAdjustmentInput => ({
  name: content.name ?? '',
  baseDifficulty: content.baseDifficulty,
  flyerDifficulty: content.flyerDifficulty,
  description: content.description ?? '',
  tags: content.tags,
});

/**
 * The adjustments of the values retained by the validator, in the order of the form, or the content errors of these
 * values (same rules as a proposal). Compared once normalised, as the API does: a value differing only by superfluous
 * spaces is no adjustment, a change of case of the name is one; the same tags in another order are no adjustment.
 */
export const transitionAdjustmentsOf = (
  proposed: TransitionContent,
  input: TransitionAdjustmentInput,
): Result<readonly TransitionAdjustment[], TransitionFieldError[]> => {
  const retained = validateTransitionContent(input);
  if (!retained.ok) return fail(retained.error);
  const differs = (field: AdjustableTransitionField) =>
    field === 'tags'
      ? !sameTags(retained.value.tags, proposed.tags)
      : retained.value[field] !== proposed[field];
  return ok(
    adjustableTransitionFields
      .filter(differs)
      .map(
        (field) =>
          ({ field, proposed: proposed[field], retained: retained.value[field] }) as TransitionAdjustment,
      ),
  );
};

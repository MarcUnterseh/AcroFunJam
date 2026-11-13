import { fail, ok, type Result } from '../common/result';
import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import {
  checkTransitionDescription,
  type TransitionDescription,
  type TransitionDescriptionError,
} from '../shared-kernel/transition-description';
import {
  checkTransitionName,
  type TransitionName,
  type TransitionNameError,
} from '../shared-kernel/transition-name';

/**
 * A published pose a transition designates (story 7): its id and its current name. Contribution has its own type: the
 * bounded contexts do not import each other.
 */
export type TransitionPose = { readonly id: string; readonly name: string };

/**
 * What the person answered in the form « Proposer une transition », in the order of the form; '' for a pose not chosen
 * (the empty option « Choisis une pose »), null for a difficulty not answered (no default value).
 */
export type TransitionProposalInput = {
  readonly fromPoseId: string;
  readonly toPoseId: string;
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel | null;
  readonly flyerDifficulty: DifficultyLevel | null;
  readonly description: string;
};

/** The fields of the form, in its order: the poses, the name, the difficulties, the description. */
export const transitionFields = [
  'fromPoseId',
  'toPoseId',
  'name',
  'baseDifficulty',
  'flyerDifficulty',
  'description',
] as const;

export type TransitionField = (typeof transitionFields)[number];

/** The content rules of a transition, with the codes of the API (ADR 0030). */
export type TransitionContentErrorCode =
  | 'contribution.from-pose-required'
  | 'contribution.to-pose-required'
  | TransitionNameError
  | 'pose.base-difficulty-required'
  | 'pose.flyer-difficulty-required'
  | TransitionDescriptionError;

export type TransitionFieldError = {
  readonly field: TransitionField;
  readonly code: TransitionContentErrorCode;
};

/** The content of a transition, proposed or retained: what a validator may adjust (never its poses). */
export type TransitionContent = {
  readonly name: TransitionName | null;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly description: TransitionDescription | null;
};

/** A transition the site may send: every rule it can check is met (the API checks the poses and the place taken). */
export type ValidTransitionProposal = TransitionContent & {
  readonly fromPoseId: string;
  readonly toPoseId: string;
};

/** The form as it opens: the departure pose prefilled with the pose consulted, nothing else answered. */
export const emptyTransitionProposalInput = (fromPoseId: string): TransitionProposalInput => ({
  fromPoseId,
  toPoseId: '',
  name: '',
  baseDifficulty: null,
  flyerDifficulty: null,
  description: '',
});

/** The content of a transition (name, difficulties, description) as typed, checked: every error at once. */
export const validateTransitionContent = (
  input: Pick<TransitionProposalInput, 'name' | 'baseDifficulty' | 'flyerDifficulty' | 'description'>,
): Result<TransitionContent, TransitionFieldError[]> => {
  const errors: TransitionFieldError[] = [];
  const name = checkTransitionName(input.name);
  if (!name.ok) errors.push({ field: 'name', code: name.error });
  const { baseDifficulty, flyerDifficulty } = input;
  if (baseDifficulty === null)
    errors.push({ field: 'baseDifficulty', code: 'pose.base-difficulty-required' });
  if (flyerDifficulty === null)
    errors.push({ field: 'flyerDifficulty', code: 'pose.flyer-difficulty-required' });
  const description = checkTransitionDescription(input.description);
  if (!description.ok) errors.push({ field: 'description', code: description.error });
  if (!name.ok || baseDifficulty === null || flyerDifficulty === null || !description.ok) return fail(errors);
  return ok({ name: name.value, baseDifficulty, flyerDifficulty, description: description.value });
};

/**
 * Same rules as the API, checked before sending; unlike the API, which stops at the first one, every error is
 * reported at once, in the order of the form, so that each field shows its own message.
 */
export const validateTransitionProposal = (
  input: TransitionProposalInput,
): Result<ValidTransitionProposal, TransitionFieldError[]> => {
  const errors: TransitionFieldError[] = [];
  if (input.fromPoseId === '') errors.push({ field: 'fromPoseId', code: 'contribution.from-pose-required' });
  if (input.toPoseId === '') errors.push({ field: 'toPoseId', code: 'contribution.to-pose-required' });
  const content = validateTransitionContent(input);
  if (!content.ok) errors.push(...content.error);
  if (!content.ok || errors.length > 0) return fail(errors);
  return ok({ fromPoseId: input.fromPoseId, toPoseId: input.toPoseId, ...content.value });
};

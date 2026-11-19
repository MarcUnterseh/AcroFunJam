import { fail, ok, type Result } from '../common/result';
import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import { checkPoseName, type PoseName, type PoseNameError } from '../shared-kernel/pose-name';
import { sameTags, type TagReference } from '../shared-kernel/tags';
import { validateProposalsCapability } from '../shared-kernel/validation-capability';

/** What the person answered in the form « Proposer une pose »; null: not answered yet (no default value). */
export type PoseProposalInput = {
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel | null;
  readonly flyerDifficulty: DifficultyLevel | null;
  readonly canStartFlow: boolean | null;
  readonly canEndFlow: boolean | null;
  /** Story 9a: the chosen tags, optional (none: an empty list). */
  readonly tags: readonly TagReference[];
};

export type ProposalField = Exclude<keyof PoseProposalInput, 'tags'>;

/** Content rules of a pose, with the codes of the API (ADR 0018). */
export type PoseContentErrorCode =
  | PoseNameError
  | 'pose.base-difficulty-required'
  | 'pose.flyer-difficulty-required'
  | 'pose.can-start-flow-required'
  | 'pose.can-end-flow-required';

export type ProposalFieldError = { readonly field: ProposalField; readonly code: PoseContentErrorCode };

/**
 * The content of a pose, whether proposed or retained: its name, its two difficulties, its flow indicators and (story
 * 9a) its tags, a set in catalog order.
 */
export type PoseContent = {
  readonly name: PoseName;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly canStartFlow: boolean;
  readonly canEndFlow: boolean;
  readonly tags: readonly TagReference[];
};

/** The fields of a pose, in the order of the form: name, difficulties, flow indicators, tags. */
export const poseFields = [
  'name',
  'baseDifficulty',
  'flyerDifficulty',
  'canStartFlow',
  'canEndFlow',
  'tags',
] as const;

export type PoseField = (typeof poseFields)[number];

/** Whether two values of a field are the same: the tags as a set (their order does not count, Q172), the rest strictly. */
export const sameFieldValue = <F extends PoseField>(
  field: F,
  a: PoseContent[F],
  b: PoseContent[F],
): boolean =>
  field === 'tags' ? sameTags(a as readonly TagReference[], b as readonly TagReference[]) : a === b;

/**
 * A proposal the site may send: every rule it can check is met (the API checks the uniqueness of the name, and that the
 * tags are still in the list and apply to the poses).
 */
export type ValidPoseProposal = PoseContent;

export const emptyPoseProposalInput: PoseProposalInput = {
  name: '',
  baseDifficulty: null,
  flyerDifficulty: null,
  canStartFlow: null,
  canEndFlow: null,
  tags: [],
};

/**
 * Same rules as the API, checked before sending; unlike the API, which stops at the first one, every error is
 * reported at once, in the order of the form, so that each field shows its own message.
 */
export const validatePoseProposal = (
  input: PoseProposalInput,
): Result<ValidPoseProposal, ProposalFieldError[]> => {
  const errors: ProposalFieldError[] = [];
  const name = checkPoseName(input.name);
  if (!name.ok) errors.push({ field: 'name', code: name.error });
  const { baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow } = input;
  if (baseDifficulty === null)
    errors.push({ field: 'baseDifficulty', code: 'pose.base-difficulty-required' });
  if (flyerDifficulty === null)
    errors.push({ field: 'flyerDifficulty', code: 'pose.flyer-difficulty-required' });
  if (canStartFlow === null) errors.push({ field: 'canStartFlow', code: 'pose.can-start-flow-required' });
  if (canEndFlow === null) errors.push({ field: 'canEndFlow', code: 'pose.can-end-flow-required' });

  if (
    !name.ok ||
    baseDifficulty === null ||
    flyerDifficulty === null ||
    canStartFlow === null ||
    canEndFlow === null
  )
    return fail(errors);
  return ok({
    name: name.value,
    baseDifficulty,
    flyerDifficulty,
    canStartFlow,
    canEndFlow,
    tags: input.tags,
  });
};

/**
 * Whether the pose of this person will be published directly (capability "validate-proposals", ADR 0019).
 * A prediction for the display only: the confirmation relies on the status returned by the API.
 * Capability codes rather than the Identity type: the bounded contexts do not import each other.
 */
export const publishesDirectly = (capabilities: readonly string[]): boolean =>
  capabilities.includes(validateProposalsCapability);

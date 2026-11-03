import { fail, ok, type Result } from '../common/result';
import type { DifficultyLevel } from '../shared-kernel/difficulty-level';
import { checkPoseName, type PoseName, type PoseNameError } from '../shared-kernel/pose-name';

/** What the person answered in the form « Proposer une pose »; null: not answered yet (no default value). */
export type PoseProposalInput = {
  readonly name: string;
  readonly baseDifficulty: DifficultyLevel | null;
  readonly flyerDifficulty: DifficultyLevel | null;
  readonly canStartFlow: boolean | null;
  readonly canEndFlow: boolean | null;
};

export type ProposalField = keyof PoseProposalInput;

/** Content rules of a pose, with the codes of the API (ADR 0018). */
export type PoseContentErrorCode =
  | PoseNameError
  | 'pose.base-difficulty-required'
  | 'pose.flyer-difficulty-required'
  | 'pose.can-start-flow-required'
  | 'pose.can-end-flow-required';

export type ProposalFieldError = { readonly field: ProposalField; readonly code: PoseContentErrorCode };

/** A proposal the site may send: every rule it can check is met (the API checks the uniqueness of the name). */
export type ValidPoseProposal = {
  readonly name: PoseName;
  readonly baseDifficulty: DifficultyLevel;
  readonly flyerDifficulty: DifficultyLevel;
  readonly canStartFlow: boolean;
  readonly canEndFlow: boolean;
};

export const emptyPoseProposalInput: PoseProposalInput = {
  name: '',
  baseDifficulty: null,
  flyerDifficulty: null,
  canStartFlow: null,
  canEndFlow: null,
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
  return ok({ name: name.value, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow });
};

/**
 * Whether the pose of this person will be published directly (capability "validate-proposals", ADR 0019).
 * A prediction for the display only: the confirmation relies on the status returned by the API.
 * Capability codes rather than the Identity type: the bounded contexts do not import each other.
 */
export const publishesDirectly = (capabilities: readonly string[]): boolean =>
  capabilities.includes('validate-proposals');

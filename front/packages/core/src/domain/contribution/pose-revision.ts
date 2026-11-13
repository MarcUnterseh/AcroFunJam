import { fail, ok, type Result } from '../common/result';
import { normalizePoseName } from '../shared-kernel/pose-name';
import {
  poseFields,
  validatePoseProposal,
  type PoseField,
  type PoseContent,
  type PoseProposalInput,
  type ProposalFieldError,
} from './pose-proposal';
import type { PoseAdjustment } from './pose-adjustment';
import { checkRevisionMessage, type RevisionMessage, type RevisionMessageError } from './revision-message';

/**
 * A field of a pose that changes, from a value to another (story 6): current → proposed in the validation queue,
 * before → proposed (or retained) in « Mes propositions », current → new in the form of a validator.
 */
export type PoseValueChange = {
  [F in PoseField]: {
    readonly field: F;
    readonly before: PoseContent[F];
    readonly after: PoseContent[F];
  };
}[PoseField];

/** The pose with the values a revision changes; the other fields keep their value. */
export const revisedPose = (pose: PoseContent, changes: readonly PoseValueChange[]): PoseContent =>
  changes.reduce<PoseContent>((revised, change) => ({ ...revised, [change.field]: change.after }), pose);

/** A published pose as Contribution reads it to revise it (story 6, ADR 0024): its values and its version. */
export type RevisablePose = PoseContent & { readonly id: string; readonly version: number };

/** What the person typed in the form « Proposer une modification »: every value of the pose, and the message. */
export type PoseRevisionInput = { readonly values: PoseProposalInput; readonly message: string };

/** A revision the site may send: the changed fields only (current → new), from the version read. */
export type ValidPoseRevision = {
  readonly poseId: string;
  readonly poseVersion: number;
  readonly changes: readonly PoseValueChange[];
  readonly message: RevisionMessage | null;
};

export type PoseRevisionError =
  | {
      readonly kind: 'invalid-input';
      readonly errors: readonly ProposalFieldError[];
      readonly message?: RevisionMessageError;
    }
  /** Identical to the pose once normalised (Q30): there is nothing to propose. */
  | { readonly kind: 'changes-nothing' };

const typedValue = <F extends PoseField>(input: PoseProposalInput, field: F) =>
  field === 'name' ? normalizePoseName(input.name) : input[field];

/**
 * The fields whose typed value differs from the current one, in the order of the form (the tag « Modifiée »). The
 * name is compared once normalised, as the API does: superfluous spaces change nothing, the case does.
 */
export const changedFields = (current: PoseContent, input: PoseProposalInput): PoseField[] =>
  poseFields.filter((field) => typedValue(input, field) !== current[field]);

/**
 * Same rules as the API, checked before sending: the content of a pose for every value (every error at once), the
 * message, then at least one changed field. Only the changed fields are sent (Q29).
 */
export const validatePoseRevision = (
  pose: RevisablePose,
  input: PoseRevisionInput,
): Result<ValidPoseRevision, PoseRevisionError> => {
  const values = validatePoseProposal(input.values);
  const message = checkRevisionMessage(input.message);
  if (!values.ok || !message.ok)
    return fail({
      kind: 'invalid-input',
      errors: values.ok ? [] : values.error,
      ...(!message.ok && { message: message.error }),
    });
  const changes = poseFields
    .filter((field) => values.value[field] !== pose[field])
    .map((field) => ({ field, before: pose[field], after: values.value[field] }) as PoseValueChange);
  if (changes.length === 0) return fail({ kind: 'changes-nothing' });
  return ok({ poseId: pose.id, poseVersion: pose.version, changes, message: message.value });
};

/**
 * The pose changed while the person typed (R10): the fields they left as they were follow the new current values,
 * the fields they changed keep what they typed; the message is kept.
 */
export const rebaseRevisionInput = (
  input: PoseRevisionInput,
  before: PoseContent,
  after: PoseContent,
): PoseRevisionInput => {
  const changed = changedFields(before, input.values);
  const values = poseFields.reduce<PoseProposalInput>(
    (rebased, field) => ({
      ...rebased,
      [field]: changed.includes(field) ? input.values[field] : after[field],
    }),
    input.values,
  );
  return { ...input, values };
};

/**
 * Whether the revision retained by the validator, the proposed changes with the adjustments, would leave the pose as
 * it is (R15): the acceptance is then impossible, the revision is to be rejected.
 */
export const retainedRevisionChangesNothing = (
  current: PoseContent,
  changes: readonly PoseValueChange[],
  adjustments: readonly PoseAdjustment[],
): boolean => {
  const retained = adjustments.reduce<PoseContent>(
    (pose, adjustment) => ({ ...pose, [adjustment.field]: adjustment.retained }),
    revisedPose(current, changes),
  );
  return poseFields.every((field) => retained[field] === current[field]);
};

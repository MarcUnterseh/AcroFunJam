import { fail, ok, type Result } from '../common/result';
import {
  validatePoseProposal,
  type PoseProposalInput,
  type ProposalFieldError,
  type ValidPoseProposal,
} from './pose-proposal';

/** A value the validator changed before accepting (glossary « Ajustement »): proposed → retained. */
export type PoseAdjustment = {
  [F in keyof ValidPoseProposal]: {
    readonly field: F;
    readonly proposed: ValidPoseProposal[F];
    readonly retained: ValidPoseProposal[F];
  };
}[keyof ValidPoseProposal];

/** The fields of a pose, in the order of the form. */
const fields = ['name', 'baseDifficulty', 'flyerDifficulty', 'canStartFlow', 'canEndFlow'] as const;

/**
 * The adjustments of the values retained by the validator, in the order of the form, or the content errors of
 * these values (same rules as a proposal, story 3). Compared once normalised, as the API does (R9 bis): a value
 * identical to the proposed one, or differing only by superfluous spaces, is no adjustment; a change of case of
 * the name is one.
 */
export const adjustmentsOf = (
  proposed: ValidPoseProposal,
  input: PoseProposalInput,
): Result<readonly PoseAdjustment[], ProposalFieldError[]> => {
  const retained = validatePoseProposal(input);
  if (!retained.ok) return fail(retained.error);
  const adjustments = fields
    .filter((field) => retained.value[field] !== proposed[field])
    .map(
      (field) => ({ field, proposed: proposed[field], retained: retained.value[field] }) as PoseAdjustment,
    );
  return ok(adjustments);
};

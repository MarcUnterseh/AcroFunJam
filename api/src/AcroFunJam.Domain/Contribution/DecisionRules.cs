using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Who may decide on a proposal, and how, whatever its kind (pose, revision or transition proposal, ADR 0022, ADR 0026, ADR 0028).</summary>
internal static class DecisionRules
{
    /// <summary>
    /// Why the decider may not decide, if so: the capability is checked first, as read when deciding (ADR 0022);
    /// then a decision is irreversible, the first one recorded prevails.
    /// </summary>
    public static Error? CannotBeDecided(Validator by, ProposalDecision? decision)
    {
        ArgumentNullException.ThrowIfNull(by);
        if (!by.CanDecide) return ContributionErrors.ValidatorRequired;
        return decision is null ? null : ContributionErrors.ProposalAlreadyDecided;
    }

    /// <summary>A note explains adjustments to the contributor: without adjustment, it has nothing to explain.</summary>
    public static Error? NoteRefusal(AdjustmentNote? note, bool hasAdjustments) =>
        note is not null && !hasAdjustments ? ContributionErrors.AdjustmentNoteWithoutAdjustment : null;
}

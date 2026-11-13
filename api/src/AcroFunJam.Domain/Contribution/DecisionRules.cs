using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Who may decide on a proposal, whatever its kind (pose or revision proposal, ADR 0022, ADR 0026).</summary>
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
}

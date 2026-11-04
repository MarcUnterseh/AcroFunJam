using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>The concurrency conflicts of the contribution schema and the business error each one means (ADR 0022).</summary>
public static class ContributionConcurrencyConflicts
{
    public static readonly ConcurrencyConflictError PoseProposalDecided =
        new(typeof(PoseProposalRecord), ContributionErrors.ProposalAlreadyDecided);
}

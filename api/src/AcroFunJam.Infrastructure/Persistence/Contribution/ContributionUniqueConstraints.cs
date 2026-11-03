using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>The unique constraints of the contribution schema and the business error each one means.</summary>
public static class ContributionUniqueConstraints
{
    public static readonly UniqueConstraintError PendingPoseNameKey =
        new(PoseProposalRecordConfiguration.PendingNameKeyIndex, ContributionErrors.PoseNameAlreadyPending);
}

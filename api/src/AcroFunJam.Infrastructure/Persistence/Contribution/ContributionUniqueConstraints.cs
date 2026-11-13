using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>The unique constraints of the contribution schema and the business error each one means.</summary>
public static class ContributionUniqueConstraints
{
    public static readonly UniqueConstraintError PendingPoseNameKey =
        new(PoseProposalRecordConfiguration.PendingNameKeyIndex, ContributionErrors.PoseNameAlreadyPending);

    /// <summary>A name reserved by a pending revision proposal (ADR 0025).</summary>
    public static readonly UniqueConstraintError PendingRevisionReservedNameKey =
        new(PoseRevisionProposalRecordConfiguration.PendingReservedNameKeyIndex, ContributionErrors.PoseNameAlreadyPending);

    /// <summary>One pending revision per published pose (ADR 0025).</summary>
    public static readonly UniqueConstraintError PendingRevisionOfPose =
        new(PoseRevisionProposalRecordConfiguration.PendingPoseIndex, ContributionErrors.PoseRevisionAlreadyPending);

    /// <summary>A name between two poses taken by a pending transition proposal (ADR 0029).</summary>
    public static readonly UniqueConstraintError PendingTransitionNamedSlot =
        new(TransitionProposalRecordConfiguration.PendingNamedSlotIndex, ContributionErrors.TransitionNameAlreadyPending);

    /// <summary>The unnamed place between two poses taken by a pending transition proposal (ADR 0029).</summary>
    public static readonly UniqueConstraintError PendingTransitionUnnamedSlot =
        new(TransitionProposalRecordConfiguration.PendingUnnamedSlotIndex, ContributionErrors.UnnamedTransitionAlreadyPending);
}

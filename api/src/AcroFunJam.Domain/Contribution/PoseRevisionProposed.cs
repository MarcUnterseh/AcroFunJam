using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A contributor proposed to revise a published pose (story 6).</summary>
public sealed record PoseRevisionProposed(
    PoseRevisionProposalId ProposalId, ContributorId Contributor, PublishedPoseId Pose, DateTimeOffset OccurredAt) : IDomainEvent;

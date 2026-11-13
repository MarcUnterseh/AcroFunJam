using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.ProposePoseRevision;

/// <summary>
/// A contributor proposes to revise a published pose, from the version they read (story 6, ADR 0024): pending validation,
/// or published directly for a validator.
/// </summary>
public sealed record ProposePoseRevision(
    ContributorId Contributor, PublishedPoseId Pose, PublishedPoseVersion StartedFrom, PoseChanges Changes, RevisionMessage? Message = null);

/// <summary>The received revision proposal: its identifier, its status and the pose as revised.</summary>
public sealed record PoseRevisionProposalDto(PoseRevisionProposalId Id, ProposalStatus Status, ProposedPose Pose);

using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.ProposePose;

/// <summary>
/// A contributor proposes a new pose: pending validation, or published directly for a validator; with the tags chosen among
/// the list, if any (story 9a).
/// </summary>
public sealed record ProposePose(ContributorId Contributor, ProposedPose Pose, IReadOnlyCollection<TagId>? Tags = null);

/// <summary>The received proposal: its identifier, its status and the (normalised) proposed pose.</summary>
public sealed record PoseProposalDto(PoseProposalId Id, ProposalStatus Status, ProposedPose Pose);

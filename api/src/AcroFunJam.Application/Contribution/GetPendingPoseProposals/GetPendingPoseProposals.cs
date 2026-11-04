using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposals;

/// <summary>The validation queue, as seen by a validator (<paramref name="Requester"/>): the oldest proposal first.</summary>
public sealed record GetPendingPoseProposals(ValidatorId Requester);

/// <summary>
/// A proposal of the validation queue: the proposed pose, the address of its contributor (none if the account no longer
/// exists), whether the requester is that contributor, and when it was submitted.
/// </summary>
public sealed record PendingPoseProposalDto(
    PoseProposalId Id, ProposedPose ProposedPose, string? ContributorEmail, bool IsYou, DateTimeOffset SubmittedAt);

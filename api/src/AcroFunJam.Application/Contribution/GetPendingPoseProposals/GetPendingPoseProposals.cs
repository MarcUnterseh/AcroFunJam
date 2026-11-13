using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposals;

/// <summary>
/// The validation queue, as seen by a validator (<paramref name="Requester"/>): pose proposals and revision proposals together,
/// the oldest first (ADR 0027).
/// </summary>
public sealed record GetPendingPoseProposals(ValidatorId Requester);

/// <summary>
/// A proposal of the validation queue, whatever its kind: the address of its contributor (none if the account no longer
/// exists), whether the requester is that contributor, and when it was submitted.
/// </summary>
public abstract record PendingProposalDto(string? ContributorEmail, bool IsYou, DateTimeOffset SubmittedAt);

/// <summary>A pose proposal of the validation queue: the proposed pose.</summary>
public sealed record PendingPoseProposalDto(
    PoseProposalId Id, ProposedPose ProposedPose, string? ContributorEmail, bool IsYou, DateTimeOffset SubmittedAt)
    : PendingProposalDto(ContributorEmail, IsYou, SubmittedAt);

/// <summary>
/// A revision proposal of the validation queue (story 6): the revised pose, its current values (those before the revision,
/// unchanged while it is pending, ADR 0025), the changed fields and the message of the contributor.
/// </summary>
public sealed record PendingPoseRevisionDto(
    PoseRevisionProposalId Id,
    PublishedPoseId Pose,
    PriorPose Current,
    IReadOnlyList<PoseFieldChange> Changes,
    RevisionMessage? Message,
    string? ContributorEmail,
    bool IsYou,
    DateTimeOffset SubmittedAt)
    : PendingProposalDto(ContributorEmail, IsYou, SubmittedAt);

/// <summary>
/// A transition proposal of the validation queue (story 7, R13): its poses under their current names and the transition as
/// proposed.
/// </summary>
public sealed record PendingTransitionProposalDto(
    TransitionProposalId Id,
    TransitionPoses Poses,
    PoseName FromPoseName,
    PoseName ToPoseName,
    ProposedTransition Transition,
    string? ContributorEmail,
    bool IsYou,
    DateTimeOffset SubmittedAt)
    : PendingProposalDto(ContributorEmail, IsYou, SubmittedAt);

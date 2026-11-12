using System.Diagnostics;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// One of their proposals, as its contributor sees it (« Mes propositions », story 5, ADR 0023). Deliberately without any
/// member designating the validator who decided (Q12): it cannot leak to the contributor.
/// </summary>
public sealed class MyPoseProposal
{
    public required PoseProposalId Id { get; init; }

    /// <summary>The presented pose: the retained pose, the one of the catalog, once accepted (directly or not); the proposed pose otherwise.</summary>
    public required PoseName Name { get; init; }

    public required Difficulty Difficulty { get; init; }

    public required FlowBoundaries Flow { get; init; }

    public required MyProposalStatus Status { get; init; }

    public required DateTimeOffset SubmittedAt { get; init; }

    /// <summary>Once accepted or rejected; none while pending, nor for a direct publication (Q19).</summary>
    public DateTimeOffset? DecidedAt { get; init; }

    /// <summary>Each adjusted field, in the order of the form; empty unless accepted with adjustments.</summary>
    public IReadOnlyList<PoseFieldAdjustment> Adjustments { get; init; } = [];

    /// <summary>The optional message of the validator, which only accompanies an acceptance with adjustments.</summary>
    public AdjustmentNote? Note { get; init; }

    /// <summary>Why the proposal was rejected; none otherwise.</summary>
    public RejectionReason? Reason { get; init; }

    private MyPoseProposal()
    {
    }

    public static MyPoseProposal Of(PoseProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        return proposal.Decision switch
        {
            null => Proposed(proposal, MyProposalStatus.Pending),
            Rejection rejection => Proposed(proposal, MyProposalStatus.Rejected, rejection.Reason),
            Acceptance { IsDirectPublication: true } => Proposed(proposal, MyProposalStatus.PublishedDirectly),
            Acceptance acceptance => Retained(proposal, acceptance),
            _ => throw new UnreachableException($"Unknown decision: {proposal.Decision.GetType().Name}."),
        };
    }

    /// <summary>
    /// Pending, rejected or published directly: the proposed pose (a direct publication retains it as is). The decision date
    /// of a direct publication is its submission: it is not presented (Q19).
    /// </summary>
    private static MyPoseProposal Proposed(PoseProposal proposal, MyProposalStatus status, RejectionReason? reason = null) => new()
    {
        Id = proposal.Id,
        Name = proposal.Pose.Name,
        Difficulty = proposal.Pose.Difficulty,
        Flow = proposal.Pose.Flow,
        Status = status,
        SubmittedAt = proposal.SubmittedAt,
        DecidedAt = status == MyProposalStatus.PublishedDirectly ? null : proposal.Decision?.At,
        Reason = reason,
    };

    /// <summary>Accepted by a validator: the retained pose, the adjusted fields and the note, if any.</summary>
    private static MyPoseProposal Retained(PoseProposal proposal, Acceptance acceptance) => new()
    {
        Id = proposal.Id,
        Name = acceptance.Retained.Name,
        Difficulty = acceptance.Retained.Difficulty,
        Flow = acceptance.Retained.Flow,
        Status = acceptance.HasAdjustments ? MyProposalStatus.AcceptedWithAdjustments : MyProposalStatus.Accepted,
        SubmittedAt = proposal.SubmittedAt,
        DecidedAt = acceptance.At,
        Adjustments = acceptance.Retained.AdjustmentsFrom(proposal.Pose),
        Note = acceptance.Note,
    };
}

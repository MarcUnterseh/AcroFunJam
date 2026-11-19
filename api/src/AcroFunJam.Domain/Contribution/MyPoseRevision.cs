using System.Diagnostics;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// One of their revision proposals, as its contributor sees it (« Mes propositions », story 6, R19, ADR 0027): the pose by its
/// name at the time of the proposal, what changes in it (from the values before, frozen), and, once accepted with adjustments,
/// the adjustments. Deliberately without any member designating the validator who decided (Q12).
/// </summary>
public sealed class MyPoseRevision : IMyProposal
{
    public required PoseRevisionProposalId Id { get; init; }

    /// <summary>The name of the pose when the revision was proposed (decision of 2026-11-12, Q64).</summary>
    public required PoseName PoseName { get; init; }

    public required MyProposalStatus Status { get; init; }

    public required DateTimeOffset SubmittedAt { get; init; }

    /// <summary>Once accepted or rejected; none while pending, nor for a direct publication (Q19).</summary>
    public DateTimeOffset? DecidedAt { get; init; }

    /// <summary>
    /// What changes in the pose, from the values before: to the retained values once accepted, to the proposed values otherwise.
    /// </summary>
    public required IReadOnlyList<PoseFieldChange> Changes { get; init; }

    /// <summary>Each adjusted field (proposed → retained), in the order of the form; empty unless accepted with adjustments.</summary>
    public IReadOnlyList<PoseFieldAdjustment> Adjustments { get; init; } = [];

    /// <summary>The optional message of the validator, which only accompanies an acceptance with adjustments.</summary>
    public AdjustmentNote? Note { get; init; }

    /// <summary>Why the revision was rejected; none otherwise.</summary>
    public RejectionReason? Reason { get; init; }

    /// <summary>Listed under the name of the pose when the revision was proposed.</summary>
    public PoseName ListedName => PoseName;

    public Guid Identifier => Id.Value;

    private MyPoseRevision()
    {
    }

    public static MyPoseRevision Of(PoseRevisionProposal revision)
    {
        ArgumentNullException.ThrowIfNull(revision);
        return revision.Decision switch
        {
            null => Proposed(revision, MyProposalStatus.Pending),
            Rejection rejection => Proposed(revision, MyProposalStatus.Rejected, rejection.Reason),
            Acceptance { IsDirectPublication: true } => Proposed(revision, MyProposalStatus.PublishedDirectly),
            Acceptance acceptance => Retained(revision, acceptance),
            _ => throw new UnreachableException($"Unknown decision: {revision.Decision.GetType().Name}."),
        };
    }

    private static MyPoseRevision Proposed(PoseRevisionProposal revision, MyProposalStatus status, RejectionReason? reason = null) => new()
    {
        Id = revision.Id,
        PoseName = revision.Revision.Before.Name,
        Status = status,
        SubmittedAt = revision.SubmittedAt,
        DecidedAt = status == MyProposalStatus.PublishedDirectly ? null : revision.Decision?.At,
        Changes = revision.Revision.Changes,
        Reason = reason,
    };

    private static MyPoseRevision Retained(PoseRevisionProposal revision, Acceptance acceptance) => new()
    {
        Id = revision.Id,
        PoseName = revision.Revision.Before.Name,
        Status = acceptance.HasAdjustments ? MyProposalStatus.AcceptedWithAdjustments : MyProposalStatus.Accepted,
        SubmittedAt = revision.SubmittedAt,
        DecidedAt = acceptance.At,
        Changes = PoseFieldChanges.Between(revision.Revision.Before, acceptance.Retained.Name, acceptance.Retained.Difficulty, acceptance.Retained.Flow,
            acceptance.Retained.Tags),
        Adjustments = acceptance.Retained.AdjustmentsFrom(revision.Revision.After),
        Note = acceptance.Note,
    };
}

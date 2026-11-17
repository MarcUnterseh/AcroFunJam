using System.Diagnostics;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// One of their transition proposals, as its contributor sees it (« Mes propositions », story 7, R21, ADR 0028): its poses under
/// their current names, read in the catalog. Deliberately without any member designating the validator who decided (ADR 0023).
/// </summary>
public sealed class MyTransitionProposal : IMyProposal
{
    public required TransitionProposalId Id { get; init; }

    public required TransitionPoses Poses { get; init; }

    public required PoseName FromPoseName { get; init; }

    public required PoseName ToPoseName { get; init; }

    /// <summary>The presented transition: the retained one once accepted by a validator; the proposed one otherwise.</summary>
    public TransitionName? Name { get; init; }

    public required Difficulty Difficulty { get; init; }

    public TransitionDescription? Description { get; init; }

    /// <summary>Its tags (story 8, E8): the retained ones once accepted, the proposed ones otherwise.</summary>
    public TagSet Tags { get; init; } = TagSet.Empty;

    public required MyProposalStatus Status { get; init; }

    public required DateTimeOffset SubmittedAt { get; init; }

    /// <summary>Once accepted or rejected; none while pending, nor for a direct publication.</summary>
    public DateTimeOffset? DecidedAt { get; init; }

    /// <summary>Each adjusted field, in the order of the form; empty unless accepted with adjustments.</summary>
    public IReadOnlyList<TransitionFieldAdjustment> Adjustments { get; init; } = [];

    public AdjustmentNote? Note { get; init; }

    public RejectionReason? Reason { get; init; }

    /// <summary>Listed under the current name of its start pose.</summary>
    public PoseName ListedName => FromPoseName;

    public Guid Identifier => Id.Value;

    private MyTransitionProposal()
    {
    }

    public static MyTransitionProposal Of(TransitionProposal proposal, PoseName fromPoseName, PoseName toPoseName)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        return proposal.Decision switch
        {
            null => Proposed(proposal, fromPoseName, toPoseName, MyProposalStatus.Pending),
            Rejection rejection => Proposed(proposal, fromPoseName, toPoseName, MyProposalStatus.Rejected, rejection.Reason),
            TransitionAcceptance { IsDirectPublication: true } => Proposed(proposal, fromPoseName, toPoseName, MyProposalStatus.PublishedDirectly),
            TransitionAcceptance acceptance => Retained(proposal, fromPoseName, toPoseName, acceptance),
            _ => throw new UnreachableException($"Unknown decision: {proposal.Decision.GetType().Name}."),
        };
    }

    /// <summary>Pending, rejected or published directly: the proposed transition (a direct publication retains it as is).</summary>
    private static MyTransitionProposal Proposed(
        TransitionProposal proposal, PoseName from, PoseName to, MyProposalStatus status, RejectionReason? reason = null) => new()
    {
        Id = proposal.Id,
        Poses = proposal.Poses,
        FromPoseName = from,
        ToPoseName = to,
        Name = proposal.Proposed.Name,
        Difficulty = proposal.Proposed.Difficulty,
        Description = proposal.Proposed.Description,
        Tags = proposal.Proposed.Tags,
        Status = status,
        SubmittedAt = proposal.SubmittedAt,
        DecidedAt = status == MyProposalStatus.PublishedDirectly ? null : proposal.Decision?.At,
        Reason = reason,
    };

    /// <summary>Accepted by a validator: the retained transition, the adjusted fields and the note, if any.</summary>
    private static MyTransitionProposal Retained(TransitionProposal proposal, PoseName from, PoseName to, TransitionAcceptance acceptance) => new()
    {
        Id = proposal.Id,
        Poses = proposal.Poses,
        FromPoseName = from,
        ToPoseName = to,
        Name = acceptance.Retained.Name,
        Difficulty = acceptance.Retained.Difficulty,
        Description = acceptance.Retained.Description,
        Tags = acceptance.Retained.Tags,
        Status = acceptance.HasAdjustments ? MyProposalStatus.AcceptedWithAdjustments : MyProposalStatus.Accepted,
        SubmittedAt = proposal.SubmittedAt,
        DecidedAt = acceptance.At,
        Adjustments = acceptance.Retained.AdjustmentsFrom(proposal.Proposed),
        Note = acceptance.Note,
    };
}

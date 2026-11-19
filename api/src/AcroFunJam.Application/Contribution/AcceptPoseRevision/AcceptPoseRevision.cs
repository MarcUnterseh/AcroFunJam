using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseRevision;

/// <summary>
/// A validator accepts a revision proposal, possibly with adjustments and a note (story 6, ADR 0026): the pose is revised
/// with the retained revision.
/// </summary>
public sealed record AcceptPoseRevision(PoseRevisionProposalId Proposal, ValidatorId By, PoseAdjustments Adjustments, AdjustmentNote? Note)
{
    /// <summary>The retained tags, by identifier (story 9a): none keeps the proposed ones, empty removes them.</summary>
    public IReadOnlyCollection<TagId>? Tags { get; init; }
}

/// <summary>The decided revision proposal: its status and, once accepted, the retained pose and whether it was adjusted.</summary>
public sealed record DecidedPoseRevisionDto(PoseRevisionProposalId Id, ProposalStatus Status, RetainedPose? Retained, bool HasAdjustments);

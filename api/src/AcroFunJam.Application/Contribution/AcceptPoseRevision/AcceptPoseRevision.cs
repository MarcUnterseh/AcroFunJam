using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseRevision;

/// <summary>
/// A validator accepts a revision proposal, possibly with adjustments and a note (story 6, ADR 0026): the pose is revised
/// with the retained revision.
/// </summary>
public sealed record AcceptPoseRevision(PoseRevisionProposalId Proposal, ValidatorId By, PoseAdjustments Adjustments, AdjustmentNote? Note);

/// <summary>The decided revision proposal: its status and, once accepted, the retained pose and whether it was adjusted.</summary>
public sealed record DecidedPoseRevisionDto(PoseRevisionProposalId Id, ProposalStatus Status, RetainedPose? Retained, bool HasAdjustments);

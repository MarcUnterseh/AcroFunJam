using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// A proposal just decided: its identifier, its new status (accepted or rejected) and, when accepted, the retained pose
/// (published) and whether the validator adjusted it (ADR 0022).
/// </summary>
public sealed record DecidedPoseProposalDto(PoseProposalId Id, ProposalStatus Status, RetainedPose? Retained, bool Adjusted);

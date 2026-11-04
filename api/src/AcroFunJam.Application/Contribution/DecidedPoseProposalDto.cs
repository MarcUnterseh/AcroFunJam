using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>A proposal just decided: its identifier, its new status (accepted or rejected) and its pose.</summary>
public sealed record DecidedPoseProposalDto(PoseProposalId Id, ProposalStatus Status, ProposedPose Pose);

using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseProposal;

/// <summary>
/// A validator (<paramref name="By"/>) accepts a pending proposal, possibly with adjustments and a note explaining them:
/// its retained pose is published in the catalog (ADR 0022).
/// </summary>
public sealed record AcceptPoseProposal(PoseProposalId Proposal, ValidatorId By, PoseAdjustments Adjustments, AdjustmentNote? Note);

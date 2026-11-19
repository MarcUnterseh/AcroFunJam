using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.AcceptPoseProposal;

/// <summary>
/// A validator (<paramref name="By"/>) accepts a pending proposal, possibly with adjustments and a note explaining them:
/// its retained pose is published in the catalog (ADR 0022). The retained tags, chosen among the list, replace the proposed ones
/// when given (story 9a).
/// </summary>
public sealed record AcceptPoseProposal(
    PoseProposalId Proposal, ValidatorId By, PoseAdjustments Adjustments, AdjustmentNote? Note, IReadOnlyCollection<TagId>? Tags = null);

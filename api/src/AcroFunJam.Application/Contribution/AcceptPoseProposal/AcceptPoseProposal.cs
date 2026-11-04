using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseProposal;

/// <summary>A validator (<paramref name="By"/>) accepts a pending proposal: its pose is published in the catalog.</summary>
public sealed record AcceptPoseProposal(PoseProposalId Proposal, ValidatorId By);

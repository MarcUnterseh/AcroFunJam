using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectPoseProposal;

/// <summary>A validator (<paramref name="By"/>) rejects a pending proposal, with a reason for its contributor.</summary>
public sealed record RejectPoseProposal(PoseProposalId Proposal, ValidatorId By, RejectionReason Reason);

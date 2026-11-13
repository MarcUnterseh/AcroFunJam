using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectPoseRevision;

/// <summary>A validator (<paramref name="By"/>) rejects a pending revision proposal, with a reason for its contributor (story 6).</summary>
public sealed record RejectPoseRevision(PoseRevisionProposalId Proposal, ValidatorId By, RejectionReason Reason);

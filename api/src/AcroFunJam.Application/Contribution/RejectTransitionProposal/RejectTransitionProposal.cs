using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectTransitionProposal;

/// <summary>A validator rejects a transition proposal, with a reason for its contributor (story 7, R19).</summary>
public sealed record RejectTransitionProposal(TransitionProposalId Proposal, ValidatorId By, RejectionReason Reason);

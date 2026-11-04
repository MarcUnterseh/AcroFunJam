namespace AcroFunJam.Domain.Contribution;

/// <summary>A validator rejected the proposal, with a reason for its contributor: nothing is published.</summary>
public sealed record Rejection(ValidatorId By, DateTimeOffset At, RejectionReason Reason) : ProposalDecision(By, At);

namespace AcroFunJam.Domain.Contribution;

/// <summary>A validator accepted the proposal: its pose is published in the catalog.</summary>
public sealed record Acceptance(ValidatorId By, DateTimeOffset At) : ProposalDecision(By, At);

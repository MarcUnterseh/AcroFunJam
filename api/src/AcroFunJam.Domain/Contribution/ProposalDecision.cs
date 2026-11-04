namespace AcroFunJam.Domain.Contribution;

/// <summary>What a validator decided on a proposal, by whom and when. Irreversible: a proposal has at most one.</summary>
public abstract record ProposalDecision(ValidatorId By, DateTimeOffset At);

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The person who decides on a proposal, as Contribution sees it: whether they can still accept or refuse proposals
/// (validator or administrator), read from their current role when they decide (ADR 0022).
/// </summary>
public sealed record Validator(ValidatorId Id, bool CanDecide);

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The person submitting a proposal, as Contribution sees it: whether they may accept or refuse proposals
/// (validator or administrator), read from their current role when they propose (ADR 0016).
/// </summary>
public sealed record Contributor(ContributorId Id, bool IsValidator);

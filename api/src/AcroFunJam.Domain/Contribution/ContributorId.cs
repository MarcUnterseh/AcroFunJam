namespace AcroFunJam.Domain.Contribution;

/// <summary>Identifier of the person who submits a proposal (the same value as the account identifier).</summary>
public readonly record struct ContributorId(Guid Value);

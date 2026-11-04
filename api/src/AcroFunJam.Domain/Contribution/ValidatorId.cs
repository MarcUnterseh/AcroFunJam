namespace AcroFunJam.Domain.Contribution;

/// <summary>Identifier of the person who decides on a proposal (the same value as the account identifier).</summary>
public readonly record struct ValidatorId(Guid Value);

namespace AcroFunJam.Domain.Contribution;

/// <summary>Identifier of the person who submits a proposal (the same value as the account identifier).</summary>
public readonly record struct ContributorId(Guid Value)
{
    /// <summary>The same person, deciding on a proposal: one account, two roles in Contribution.</summary>
    public ValidatorId AsValidator() => new(Value);
}

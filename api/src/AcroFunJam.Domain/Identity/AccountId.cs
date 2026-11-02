namespace AcroFunJam.Domain.Identity;

/// <summary>Identifier of an account (the same value as the identity library's user id).</summary>
public readonly record struct AccountId(Guid Value);

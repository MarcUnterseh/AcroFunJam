using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>An administrator (<paramref name="RevokedBy"/>) revoked a role: the account is back to the user role.</summary>
public sealed record RoleRevoked(AccountId AccountId, Role Role, AccountId RevokedBy, DateTimeOffset OccurredAt) : IDomainEvent;

using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>
/// An account received a new role, from an administrator (<paramref name="AssignedBy"/>),
/// or as the initial administrator at deployment (no author).
/// </summary>
public sealed record RoleAssigned(AccountId AccountId, Role Role, AccountId? AssignedBy, DateTimeOffset OccurredAt) : IDomainEvent;

using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.RevokeRole;

/// <summary>An administrator (<paramref name="By"/>) takes a role back from the account using this address.</summary>
public sealed record RevokeRole(EmailAddress Email, Role Role, AccountId By);

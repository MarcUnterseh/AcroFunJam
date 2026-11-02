using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.AssignRole;

/// <summary>An administrator (<paramref name="By"/>) gives a role to the account using this address (a lower role demotes it).</summary>
public sealed record AssignRole(EmailAddress Email, Role Role, AccountId By);

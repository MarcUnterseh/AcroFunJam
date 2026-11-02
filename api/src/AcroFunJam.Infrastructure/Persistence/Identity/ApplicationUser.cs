using Microsoft.AspNetCore.Identity;
using DomainRole = AcroFunJam.Domain.Identity.Role;

namespace AcroFunJam.Infrastructure.Persistence.Identity;

/// <summary>
/// Account stored by ASP.NET Core Identity, extended with the single ordered role of the product
/// (column instead of Identity's role tables, which allow several roles per account — ADR 0008).
/// </summary>
public sealed class ApplicationUser : IdentityUser<Guid>
{
    /// <summary>Code of the role (<c>user</c>, <c>validator</c>, <c>administrator</c>); every new account is a user.</summary>
    public string Role { get; set; } = DomainRole.Default.Code;
}

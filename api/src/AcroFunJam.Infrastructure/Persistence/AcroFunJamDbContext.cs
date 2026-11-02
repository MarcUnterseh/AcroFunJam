using AcroFunJam.Infrastructure.Persistence.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// Single database context of the modular monolith: one PostgreSQL schema per bounded context (ADR 0007),
/// including the accounts of ASP.NET Core Identity in the <c>identity</c> schema (ADR 0008).
/// </summary>
public sealed class AcroFunJamDbContext(DbContextOptions<AcroFunJamDbContext> options)
    : IdentityUserContext<ApplicationUser, Guid>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        base.OnModelCreating(builder);
        // Fluent configurations live next to this context (one IEntityTypeConfiguration per aggregate).
        builder.ApplyConfigurationsFromAssembly(typeof(AcroFunJamDbContext).Assembly);
    }
}

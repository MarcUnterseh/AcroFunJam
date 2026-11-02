using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence;

public sealed class AcroFunJamDbContext(DbContextOptions<AcroFunJamDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        // Fluent configurations live next to this context (one IEntityTypeConfiguration per aggregate).
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AcroFunJamDbContext).Assembly);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>Builds the context for the EF Core tooling (migrations) without depending on the Api project.</summary>
public sealed class AcroFunJamDesignTimeDbContextFactory : IDesignTimeDbContextFactory<AcroFunJamDbContext>
{
    // Local docker-compose database; generating a migration does not connect to it.
    private const string LocalConnectionString =
        "Host=localhost;Port=5432;Database=acrofunjam;Username=acrofunjam;Password=acrofunjam";

    public AcroFunJamDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AcroFunJamDbContext>()
            .UseNpgsql(LocalConnectionString)
            .Options;
        return new AcroFunJamDbContext(options);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>The story 3 migration of catalog.poses assumes an empty table, and says so (ADR 0017).</summary>
[Trait("Category", "Integration")]
public sealed class ExtendCatalogPosesMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Migrate_Should_Refuse_When_CatalogPosesIsNotEmpty()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("CreateContributionPoseProposals", cancellationToken: Ct);
        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO catalog.poses (id, name, base_difficulty, flyer_difficulty) VALUES (gen_random_uuid(), 'Bird', 'discovery', 'discovery')", Ct);

        var refusal = await Should.ThrowAsync<PostgresException>(() => migrator.MigrateAsync(cancellationToken: Ct));

        refusal.MessageText.ShouldBe("catalog.poses doit être vide (story 3)");
    }
}

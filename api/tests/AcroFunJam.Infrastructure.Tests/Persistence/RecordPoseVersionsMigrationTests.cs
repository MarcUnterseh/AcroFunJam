using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>The story 6 migration gives the poses already published the first version (ADR 0024).</summary>
[Trait("Category", "Integration")]
public sealed class RecordPoseVersionsMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Migrate_Should_SetVersionOne_When_PosesAreAlreadyPublished()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("RecordDirectPublications", cancellationToken: Ct);
        await context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO catalog.poses (id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, published_at)
            VALUES (gen_random_uuid(), 'Bird', 'bird', 'discovery', 'discovery', true, true, now())
            """, Ct);

        await migrator.MigrateAsync("RecordPoseVersions", cancellationToken: Ct);

        var versions = await context.Database.SqlQueryRaw<int>("SELECT version AS \"Value\" FROM catalog.poses").ToListAsync(Ct);
        versions.ShouldBe([1]);
    }
}

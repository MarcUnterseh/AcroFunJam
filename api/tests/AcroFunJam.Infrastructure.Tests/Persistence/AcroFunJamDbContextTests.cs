using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

[Trait("Category", "Integration")]
public sealed class AcroFunJamDbContextTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    [Fact]
    public async Task Migrate_Should_CreateTheSchema_When_TheDatabaseIsEmpty()
    {
        await using var context = database.CreateDbContext();

        await context.Database.MigrateAsync(TestContext.Current.CancellationToken);

        (await context.Database.CanConnectAsync(TestContext.Current.CancellationToken)).ShouldBeTrue();
        (await context.Database.GetPendingMigrationsAsync(TestContext.Current.CancellationToken)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Migrate_Should_LeaveNoDefaultValue_When_ColumnsAreAddedToCatalogPoses()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(TestContext.Current.CancellationToken);

        // The application always writes these columns: a default value would hide a forgotten one.
        var defaults = await context.Database.SqlQueryRaw<string>(
                """
                SELECT column_name AS "Value" FROM information_schema.columns
                WHERE table_schema = 'catalog' AND table_name = 'poses' AND column_default IS NOT NULL
                """)
            .ToListAsync(TestContext.Current.CancellationToken);

        defaults.ShouldBeEmpty();
    }

    [Fact]
    public void Model_Should_MatchTheMigrations_When_Compiled()
    {
        using var context = database.CreateDbContext();

        // Fails when the EF model changed without a new migration (snapshot drift).
        context.Database.HasPendingModelChanges().ShouldBeFalse();
    }
}

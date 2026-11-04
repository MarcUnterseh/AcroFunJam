using Microsoft.EntityFrameworkCore;
using Npgsql;

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

    /// <summary>Inserts a proposal named Throne with the given decision columns, bypassing the application.</summary>
    private async Task InsertProposal(string status, bool decided, string? rejectionReason)
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(TestContext.Current.CancellationToken);
        Guid? decidedBy = decided ? Guid.NewGuid() : null;
        DateTimeOffset? decidedAt = decided ? DateTimeOffset.UtcNow : null;
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at, decided_by, decided_at, rejection_reason)
            VALUES ({Guid.NewGuid()}, {Guid.NewGuid()}, 'Throne', 'throne', 'beginner', 'beginner', true, true, {status}, {DateTimeOffset.UtcNow}, {decidedBy}, {decidedAt}, {rejectionReason})
            """,
            TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Database_Should_RefuseARejectedProposal_When_ItHasNoReason()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertProposal("rejected", decided: true, rejectionReason: null));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Theory]
    [InlineData("pending", true, null)]
    [InlineData("accepted", false, null)]
    [InlineData("rejected", false, "Doublon de Chair")]
    public async Task Database_Should_RefuseAProposal_When_ItsDecisionColumnsContradictItsStatus(
        string status, bool decided, string? rejectionReason)
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertProposal(status, decided, rejectionReason));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseARejectionReason_When_ItHasMoreThan500Characters()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertProposal("rejected", decided: true, new string('é', 501)));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }
}

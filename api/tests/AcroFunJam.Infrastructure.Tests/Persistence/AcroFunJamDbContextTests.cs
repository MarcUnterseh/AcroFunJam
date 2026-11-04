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

    /// <summary>Inserts a decided proposal named Throne with the given retained pose and note, bypassing the application; returns its id.</summary>
    private async Task<Guid> InsertDecidedProposal(
        string status, string? retainedName, string? retainedBaseDifficulty = "beginner", string? adjustmentNote = null)
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(TestContext.Current.CancellationToken);
        var rejectionReason = status == "rejected" ? "Doublon de Chair" : null;
        bool? retainedFlow = retainedName is null ? null : true;
        var id = Guid.NewGuid();
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at,
                 decided_by, decided_at, rejection_reason,
                 retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow, adjustment_note)
            VALUES ({id}, {Guid.NewGuid()}, 'Throne', 'throne', 'beginner', 'beginner', true, true, {status}, {DateTimeOffset.UtcNow},
                    {Guid.NewGuid()}, {DateTimeOffset.UtcNow}, {rejectionReason},
                    {retainedName}, {(retainedName is null ? null : retainedBaseDifficulty)}, {(retainedName is null ? null : "beginner")},
                    {retainedFlow}, {retainedFlow}, {adjustmentNote})
            """,
            TestContext.Current.CancellationToken);
        return id;
    }

    [Fact]
    public async Task Database_Should_StoreAnAcceptedProposal_When_ItHasItsRetainedPoseAndANote()
    {
        var id = await InsertDecidedProposal("accepted", "THRONE", adjustmentNote: "Casse ajustée.");

        await using var context = database.CreateDbContext();
        var stored = await context.Database.SqlQuery<StoredAcceptance>(
                $"""SELECT retained_name AS "RetainedName", adjustment_note AS "AdjustmentNote" FROM contribution.pose_proposals WHERE id = {id}""")
            .SingleAsync(TestContext.Current.CancellationToken);
        stored.ShouldBe(new StoredAcceptance("THRONE", "Casse ajustée."));
    }

    private sealed record StoredAcceptance(string? RetainedName, string? AdjustmentNote);

    [Fact]
    public async Task Database_Should_RefuseAnAcceptedProposal_When_ItHasNoRetainedPose()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("accepted", retainedName: null));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseARejectedProposal_When_ItHasARetainedPose()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("rejected", "Throne"));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseAnAdjustmentNote_When_TheProposalIsNotAccepted()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("rejected", retainedName: null, adjustmentNote: "Note"));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseAnAdjustmentNote_When_TheRetainedPoseIsTheProposedPose()
    {
        // A note only accompanies an acceptance with adjustments (ADR 0022): here the retained pose is Throne as proposed.
        var refusal = await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("accepted", "Throne", adjustmentNote: "Belle proposition."));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseAnAdjustmentNote_When_ItHasMoreThan500Characters()
    {
        var refusal = await Should.ThrowAsync<PostgresException>(
            () => InsertDecidedProposal("accepted", "THRONE", adjustmentNote: new string('é', 501)));

        refusal.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Database_Should_RefuseARetainedPose_When_ItsDifficultyIsOffTheScaleOrItsNameTooLong()
    {
        (await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("accepted", "Throne", retainedBaseDifficulty: "expert")))
            .SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
        (await Should.ThrowAsync<PostgresException>(() => InsertDecidedProposal("accepted", new string('x', 61))))
            .SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
    }
}

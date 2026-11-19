using Microsoft.EntityFrameworkCore;
using AcroFunJam.Infrastructure.Persistence.Contribution;
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
                 retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow, adjustment_note,
                 retained_tag_ids)
            VALUES ({id}, {Guid.NewGuid()}, 'Throne', 'throne', 'beginner', 'beginner', true, true, {status}, {DateTimeOffset.UtcNow},
                    {Guid.NewGuid()}, {DateTimeOffset.UtcNow}, {rejectionReason},
                    {retainedName}, {(retainedName is null ? null : retainedBaseDifficulty)}, {(retainedName is null ? null : "beginner")},
                    {retainedFlow}, {retainedFlow}, {adjustmentNote}, {(retainedName is null ? null : Array.Empty<Guid>())})
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

    /// <summary>
    /// A direct publication is accepted, decided by its contributor at the instant of the submission, retains the proposed pose as
    /// is and carries no note (ADR 0023): each branch broken on an otherwise coherent row. A rejection has no retained pose and a
    /// note comes only with adjustments, so those two cases also break the retained pose branch.
    /// </summary>
    [Theory]
    [InlineData("status")]
    [InlineData("decided_by")]
    [InlineData("decided_at")]
    [InlineData("adjustment_note")]
    [InlineData("retained_name")]
    [InlineData("retained_flyer_difficulty")]
    [InlineData("retained_can_end_flow")]
    public async Task SaveChanges_Should_BeRefusedByTheDatabase_When_PublishedDirectlyIncoherently(string broken)
    {
        var ct = TestContext.Current.CancellationToken;
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(ct);
        var bruno = Guid.NewGuid();
        var at = new DateTimeOffset(2026, 11, 9, 10, 0, 0, TimeSpan.Zero);
        var published = new PoseProposalRecord
        {
            Id = Guid.NewGuid(),
            ContributorId = bruno,
            Name = "Throne",
            NameKey = "throne " + Guid.NewGuid(),
            BaseDifficulty = "beginner",
            FlyerDifficulty = "discovery",
            CanStartFlow = true,
            CanEndFlow = true,
            Status = "accepted",
            SubmittedAt = at,
            DecidedBy = bruno,
            DecidedAt = at,
            RetainedName = "Throne",
            RetainedBaseDifficulty = "beginner",
            RetainedFlyerDifficulty = "discovery",
            RetainedCanStartFlow = true,
            RetainedCanEndFlow = true,
            PublishedDirectly = true,
        };
        Break(published, broken);
        context.Add(published);

        var refusal = await Should.ThrowAsync<DbUpdateException>(() => context.SaveChangesAsync(ct));

        var violation = refusal.InnerException.ShouldBeOfType<PostgresException>();
        violation.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
        violation.ConstraintName.ShouldBe("ck_pose_proposals_published_directly");
    }

    private static void Break(PoseProposalRecord published, string broken)
    {
        switch (broken)
        {
            case "status":
                published.Status = "rejected";
                published.RejectionReason = "Doublon.";
                published.RetainedName = null;
                published.RetainedBaseDifficulty = null;
                published.RetainedFlyerDifficulty = null;
                published.RetainedCanStartFlow = null;
                published.RetainedCanEndFlow = null;
                break;
            case "decided_by":
                published.DecidedBy = Guid.NewGuid();
                break;
            case "decided_at":
                published.DecidedAt = published.SubmittedAt.AddMinutes(5);
                break;
            case "adjustment_note":
                published.RetainedName = "THRONE";
                published.AdjustmentNote = "Casse ajustée.";
                break;
            case "retained_name":
                published.RetainedName = "THRONE";
                break;
            case "retained_flyer_difficulty":
                published.RetainedFlyerDifficulty = "intermediate";
                break;
            case "retained_can_end_flow":
                published.RetainedCanEndFlow = false;
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(broken), broken, "Unknown branch.");
        }
    }
}

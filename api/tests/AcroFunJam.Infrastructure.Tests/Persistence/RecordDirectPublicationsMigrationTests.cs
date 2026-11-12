using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>
/// The story 5 migration records the direct publications (ADR 0023): before it, only <c>Submit</c> recorded a decision in the
/// same request as the submission, so an acceptance by its contributor at the very instant of the submission is one.
/// </summary>
[Trait("Category", "Integration")]
public sealed class RecordDirectPublicationsMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private const string PreviousMigration = "RecordRetainedPoses";
    private static readonly DateTimeOffset Submitted = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Each test starts from an empty table, just before the migration.</summary>
    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync(cancellationToken: Ct);
        await context.Database.ExecuteSqlRawAsync("DELETE FROM contribution.pose_proposals", Ct);
        await migrator.MigrateAsync(PreviousMigration, cancellationToken: Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    /// <summary>An accepted proposal as stored before the migration: retained as proposed, without note.</summary>
    private static async Task<Guid> InsertAccepted(AcroFunJamDbContext context, Guid contributor, Guid decidedBy, DateTimeOffset decidedAt)
    {
        var id = Guid.NewGuid();
        var nameKey = "throne " + id;
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at,
                 decided_by, decided_at, retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow,
                 retained_can_end_flow)
            VALUES ({id}, {contributor}, 'Throne', {nameKey}, 'beginner', 'discovery', true, true, 'accepted', {Submitted},
                    {decidedBy}, {decidedAt}, 'Throne', 'beginner', 'discovery', true, true)
            """, Ct);
        return id;
    }

    private static Task<bool> PublishedDirectly(AcroFunJamDbContext context, Guid id) =>
        context.Database.SqlQuery<bool>($"""SELECT published_directly AS "Value" FROM contribution.pose_proposals WHERE id = {id}""")
            .SingleAsync(Ct);

    [Fact]
    public async Task Up_Should_MarkAsPublishedDirectly_When_AcceptedByItsContributorAtSubmission()
    {
        await using var context = database.CreateDbContext();
        var bruno = Guid.NewGuid();
        var published = await InsertAccepted(context, bruno, decidedBy: bruno, decidedAt: Submitted);

        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);

        (await PublishedDirectly(context, published)).ShouldBeTrue();
    }

    /// <summary>Story 4, R17: the contributor promoted since accepted their own proposal in a later request.</summary>
    [Fact]
    public async Task Up_Should_LeaveNotDirect_When_AcceptedByItsContributorLater()
    {
        await using var context = database.CreateDbContext();
        var alice = Guid.NewGuid();
        var accepted = await InsertAccepted(context, alice, decidedBy: alice, decidedAt: Submitted.AddMinutes(5));

        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);

        (await PublishedDirectly(context, accepted)).ShouldBeFalse();
    }

    [Fact]
    public async Task Up_Should_LeaveNotDirect_When_AcceptedByAnotherValidatorOrPendingOrRejected()
    {
        await using var context = database.CreateDbContext();
        var alice = Guid.NewGuid();
        var acceptedByBruno = await InsertAccepted(context, alice, decidedBy: Guid.NewGuid(), decidedAt: Submitted);
        var pending = Guid.NewGuid();
        var rejected = Guid.NewGuid();
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at,
                 decided_by, decided_at, rejection_reason)
            VALUES ({pending}, {alice}, 'Star', 'star', 'beginner', 'discovery', true, true, 'pending', {Submitted}, NULL, NULL, NULL),
                   ({rejected}, {alice}, 'Bird', 'bird', 'beginner', 'discovery', true, true, 'rejected', {Submitted}, {alice}, {Submitted},
                    'Doublon.')
            """, Ct);

        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);

        (await PublishedDirectly(context, acceptedByBruno)).ShouldBeFalse();
        (await PublishedDirectly(context, pending)).ShouldBeFalse();
        (await PublishedDirectly(context, rejected)).ShouldBeFalse();
    }

    /// <summary>
    /// An atypical row, accepted by its contributor at the very instant of the submission yet adjusted or explained (a frozen
    /// clock): it is no direct publication, and must not block the deployment by breaking the check constraint.
    /// </summary>
    [Theory]
    [InlineData("retained_name = 'Throne Bird'")]
    [InlineData("retained_can_end_flow = false")]
    [InlineData("retained_name = 'THRONE', adjustment_note = 'Casse ajustée.'")]
    public async Task Up_Should_LeaveNotDirect_When_AcceptedByItsContributorAtSubmissionWithAdjustments(string adjusted)
    {
        await using var context = database.CreateDbContext();
        var alice = Guid.NewGuid();
        var accepted = await InsertAccepted(context, alice, decidedBy: alice, decidedAt: Submitted);
#pragma warning disable EF1002 // The adjusted columns are constants of the test, not an input.
        await context.Database.ExecuteSqlRawAsync(
            $"UPDATE contribution.pose_proposals SET {adjusted} WHERE id = '{accepted}'", Ct);
#pragma warning restore EF1002

        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);

        (await PublishedDirectly(context, accepted)).ShouldBeFalse();
    }

    /// <summary>Nothing is lost that cannot be inferred again (ADR 0023).</summary>
    [Fact]
    public async Task Down_Should_DropPublishedDirectly_When_Reverted()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        var bruno = Guid.NewGuid();
        await InsertAccepted(context, bruno, decidedBy: bruno, decidedAt: Submitted);
        await migrator.MigrateAsync(cancellationToken: Ct);

        await migrator.MigrateAsync(PreviousMigration, cancellationToken: Ct);

        var columns = await context.Database.SqlQuery<string>(
                $"""
                SELECT column_name AS "Value" FROM information_schema.columns
                WHERE table_schema = 'contribution' AND table_name = 'pose_proposals'
                """)
            .ToListAsync(Ct);
        columns.ShouldNotContain("published_directly");
    }
}

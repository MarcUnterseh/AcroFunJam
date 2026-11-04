using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>
/// The story 4 step B migration records the retained pose of each acceptance: the proposals accepted before it were accepted
/// as proposed, so their retained pose is their proposed pose (ADR 0022).
/// </summary>
[Trait("Category", "Integration")]
public sealed class RecordRetainedPosesMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Migration_Should_RetainTheProposedValues_When_ProposalsWereAlreadyAccepted()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("RecordProposalDecisions", cancellationToken: Ct);
        var accepted = Guid.NewGuid();
        var pending = Guid.NewGuid();
        var validator = Guid.NewGuid();
        var at = new DateTimeOffset(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at, decided_by, decided_at)
            VALUES ({accepted}, {validator}, 'Hand-to-Hand (L-base)', 'hand to hand l base', 'advanced', 'intermediate', false, true, 'accepted', {at}, {validator}, {at}),
                   ({pending}, {validator}, 'Throne', 'throne', 'beginner', 'discovery', true, true, 'pending', {at}, NULL, NULL)
            """, Ct);

        await migrator.MigrateAsync(cancellationToken: Ct);

        var retained = await context.Database.SqlQuery<StoredRetainedPose>(
                $"""
                SELECT id AS "Id", retained_name AS "Name", retained_base_difficulty AS "BaseDifficulty",
                       retained_flyer_difficulty AS "FlyerDifficulty", retained_can_start_flow AS "CanStartFlow",
                       retained_can_end_flow AS "CanEndFlow", adjustment_note AS "AdjustmentNote"
                FROM contribution.pose_proposals WHERE id IN ({accepted}, {pending})
                """)
            .ToListAsync(Ct);
        retained.ShouldBe(
            [
                new StoredRetainedPose(accepted, "Hand-to-Hand (L-base)", "advanced", "intermediate", false, true, null),
                new StoredRetainedPose(pending, null, null, null, null, null, null),
            ],
            ignoreOrder: true);
    }

    [Fact]
    public async Task Revert_Should_Fail_When_AProposalWasAcceptedWithAdjustments()
    {
        // Reverting would silently lose the retained pose, hence what the catalog published: refused instead.
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync(cancellationToken: Ct);
        var adjusted = Guid.NewGuid();
        var validator = Guid.NewGuid();
        var at = new DateTimeOffset(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at,
                 decided_by, decided_at, retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow,
                 retained_can_end_flow, adjustment_note)
            VALUES ({adjusted}, {validator}, 'Thron', 'thron', 'beginner', 'discovery', true, true, 'accepted', {at},
                    {validator}, {at}, 'Throne', 'beginner', 'discovery', true, true, NULL)
            """, Ct);

        try
        {
            var refusal = await Should.ThrowAsync<PostgresException>(() => migrator.MigrateAsync("RecordProposalDecisions", cancellationToken: Ct));

            refusal.SqlState.ShouldBe(PostgresErrorCodes.RaiseException);
        }
        finally
        {
            await context.Database.ExecuteSqlAsync($"DELETE FROM contribution.pose_proposals WHERE id = {adjusted}", Ct);
        }
    }

    private sealed record StoredRetainedPose(
        Guid Id, string? Name, string? BaseDifficulty, string? FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow, string? AdjustmentNote);
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>The story 4 migration renames the decision columns of contribution.pose_proposals, keeping their data (ADR 0022).</summary>
[Trait("Category", "Integration")]
public sealed class RecordProposalDecisionsMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Migration_Should_KeepTheValidatorOfAcceptedProposals_When_RenamingTheDecisionColumns()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("ExtendCatalogPoses", cancellationToken: Ct);
        var proposal = Guid.NewGuid();
        var validator = Guid.NewGuid();
        var acceptedAt = new DateTimeOffset(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.pose_proposals
                (id, contributor_id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, status, submitted_at, accepted_by, accepted_at)
            VALUES ({proposal}, {validator}, 'Star', 'star', 'beginner', 'beginner', true, true, 'accepted', {acceptedAt}, {validator}, {acceptedAt})
            """, Ct);

        await migrator.MigrateAsync(cancellationToken: Ct);

        var decision = await context.Database.SqlQuery<StoredDecision>(
                $"SELECT decided_by AS \"DecidedBy\", decided_at AS \"DecidedAt\" FROM contribution.pose_proposals WHERE id = {proposal}")
            .SingleAsync(Ct);
        decision.ShouldBe(new StoredDecision(validator, acceptedAt));
    }

    private sealed record StoredDecision(Guid? DecidedBy, DateTimeOffset? DecidedAt);
}

using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>
/// The story 8 migration of the transition proposals (ADR 0033): every existing proposal proposed no tag, and an accepted one
/// retained none (P1), so that its acceptance is read back with an empty set.
/// </summary>
[Trait("Category", "Integration")]
public sealed class AddTransitionProposalTagsMigrationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private const string PreviousMigration = "AddTransitionTags";
    private static readonly DateTimeOffset Submitted = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Each test starts from an empty table, just before the migration.</summary>
    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync(cancellationToken: Ct);
        await context.Database.ExecuteSqlRawAsync("DELETE FROM contribution.transition_proposals", Ct);
        await migrator.MigrateAsync(PreviousMigration, cancellationToken: Ct);
    }

    public async ValueTask DisposeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);
    }

    private static async Task<Guid> Insert(AcroFunJamDbContext context, string status)
    {
        var id = Guid.NewGuid();
        var accepted = status == "accepted";
        await context.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO contribution.transition_proposals
                (id, contributor_id, from_pose_id, to_pose_id, base_difficulty, flyer_difficulty, status, submitted_at, decided_by, decided_at,
                 retained_base_difficulty, retained_flyer_difficulty, published_directly)
            VALUES ({id}, {Guid.NewGuid()}, {Guid.NewGuid()}, {Guid.NewGuid()}, 'beginner', 'beginner', {status}, {Submitted},
                    {(accepted ? Guid.NewGuid() : null)}, {(accepted ? Submitted.AddDays(1) : null)},
                    {(accepted ? "beginner" : null)}, {(accepted ? "beginner" : null)}, false)
            """, Ct);
        return id;
    }

    private static Task<TagColumns> Tags(AcroFunJamDbContext context, Guid id) =>
        context.Database.SqlQuery<TagColumns>(
                $"""SELECT proposed_tag_ids AS "Proposed", retained_tag_ids AS "Retained" FROM contribution.transition_proposals WHERE id = {id}""")
            .SingleAsync(Ct);

    [Fact]
    public async Task Up_Should_GiveNoProposedTagAndAnEmptyRetainedSet_When_TheProposalWasAccepted()
    {
        await using var context = database.CreateDbContext();
        var accepted = await Insert(context, "accepted");
        var pending = await Insert(context, "pending");

        await context.GetService<IMigrator>().MigrateAsync(cancellationToken: Ct);

        var acceptedTags = await Tags(context, accepted);
        acceptedTags.Proposed.ShouldBeEmpty();
        acceptedTags.Retained.ShouldNotBeNull().ShouldBeEmpty();
        var pendingTags = await Tags(context, pending);
        pendingTags.Proposed.ShouldBeEmpty();
        pendingTags.Retained.ShouldBeNull();
    }

    private sealed record TagColumns(Guid[] Proposed, Guid[]? Retained);
}

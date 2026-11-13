using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

/// <summary>The revision proposals of the validation queue (story 6, ADR 0027).</summary>
[Trait("Category", "Integration")]
public sealed class EfPendingPoseRevisionsReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset DecidedAt = new(2026, 11, 13, 9, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseRevisionProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    /// <summary>Stores a pending revision and a rejected one, of two different poses.</summary>
    private async Task<PoseRevisionProposal> SavePendingAndRejectedRevisions()
    {
        var pending = EfPoseRevisionProposalRepositoryTests.APendingRevision();
        var rejected = EfPoseRevisionProposalRepositoryTests.APendingRevision();
        rejected.Reject(new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true), RejectionReason.Create("Non.").Value!, DecidedAt);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRevisionProposalRepository(context, aggregates);
        repository.Add(pending);
        repository.Add(rejected);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        return pending;
    }

    [Fact]
    public async Task ListPending_Should_ReturnOnlyPendingRevisions_When_SomeAreDecided()
    {
        var pending = await SavePendingAndRejectedRevisions();
        await using var context = database.CreateDbContext();

        var listed = await new EfPendingPoseRevisionsReader(context).ListPending(Ct);

        listed.ShouldHaveSingleItem().Id.ShouldBe(pending.Id);
    }

    [Fact]
    public async Task CountPending_Should_CountOnlyPendingRevisions_When_SomeAreDecided()
    {
        await SavePendingAndRejectedRevisions();
        await using var context = database.CreateDbContext();

        (await new EfPendingPoseRevisionsReader(context).CountPending(Ct)).ShouldBe(1);
    }
}

using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

/// <summary>The revision proposals of a contributor, for « Mes propositions » (story 6, ADR 0027).</summary>
[Trait("Category", "Integration")]
public sealed class EfMyPoseRevisionsReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseRevisionProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact]
    public async Task ListSubmittedBy_Should_ReturnOnlyTheRevisionsOfTheContributor_When_SeveralContributorsProposed()
    {
        var mine = EfPoseRevisionProposalRepositoryTests.APendingRevision();
        var others = EfPoseRevisionProposalRepositoryTests.APendingRevision();
        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            var repository = new EfPoseRevisionProposalRepository(context, aggregates);
            repository.Add(mine);
            repository.Add(others);
            (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using var assert = database.CreateDbContext();
        var listed = await new EfMyPoseRevisionsReader(assert).ListSubmittedBy(mine.Contributor, Ct);

        listed.ShouldHaveSingleItem().Id.ShouldBe(mine.Id);
    }
}

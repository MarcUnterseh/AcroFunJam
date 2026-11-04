using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

[Trait("Category", "Integration")]
public sealed class EfPendingPoseProposalsReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset DecidedAt = new(2026, 11, 4, 9, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    /// <summary>Stores a pending proposal (Throne), a direct publication (Star) and a rejected proposal (Bird).</summary>
    private async Task<PoseProposal> SavePendingAcceptedAndRejectedProposals()
    {
        var throne = EfPoseProposalRepositoryTests.APendingProposal("Throne");
        var star = EfPoseProposalRepositoryTests.APendingProposal("Star", new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true));
        var bird = EfPoseProposalRepositoryTests.APendingProposal("Bird");
        bird.Reject(new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true), RejectionReason.Create("Doublon").Value!, DecidedAt);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseProposalRepository(context, aggregates);
        repository.Add(throne);
        repository.Add(star);
        repository.Add(bird);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        return throne;
    }

    [Fact]
    public async Task ListPending_Should_ReturnOnlyPendingProposals_When_SomeAreAcceptedOrRejected()
    {
        var throne = await SavePendingAcceptedAndRejectedProposals();
        await using var context = database.CreateDbContext();

        var pending = await new EfPendingPoseProposalsReader(context).ListPending(Ct);

        pending.ShouldHaveSingleItem().ShouldSatisfyAllConditions(
            p => p.Id.ShouldBe(throne.Id),
            p => p.Contributor.ShouldBe(throne.Contributor),
            p => p.Pose.ShouldBe(throne.Pose),
            p => p.SubmittedAt.ShouldBe(throne.SubmittedAt),
            p => p.Decision.ShouldBeNull());
    }

    [Fact]
    public async Task CountPending_Should_CountOnlyPendingProposals_When_SomeAreDecided()
    {
        await SavePendingAcceptedAndRejectedProposals();
        await using var context = database.CreateDbContext();

        (await new EfPendingPoseProposalsReader(context).CountPending(Ct)).ShouldBe(1);
    }
}

using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

[Trait("Category", "Integration")]
public sealed class EfPoseProposalRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    internal static PoseProposal APendingProposal(string name, Contributor? contributor = null) =>
        PoseProposal.Submit(
            new PoseProposalId(Guid.NewGuid()),
            contributor ?? new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false),
            ProposedPose.Create(name, "intermediate", "advanced", canStartFlow: false, canEndFlow: true).Value!,
            NameAvailability.Available,
            Now).Value!;

    [Fact]
    public async Task ExistsPendingWithNameKey_Should_FindOnlyPendingProposals_When_TheKeyMatches()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);
        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            var repository = new EfPoseProposalRepository(context, aggregates);
            repository.Add(APendingProposal("Throne"));
            repository.Add(APendingProposal("Star", bruno)); // accepted at once
            await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
        }

        await using var assert = database.CreateDbContext();
        var proposals = new EfPoseProposalRepository(assert, new TrackedAggregates());
        (await proposals.ExistsPendingWithNameKey(Key("THRONE"), Ct)).ShouldBeTrue();
        (await proposals.ExistsPendingWithNameKey(Key("Star"), Ct)).ShouldBeFalse();
        (await proposals.ExistsPendingWithNameKey(Key("Bird"), Ct)).ShouldBeFalse();
    }

    private static AcroFunJam.Domain.SharedKernel.PoseNameKey Key(string name) =>
        AcroFunJam.Domain.SharedKernel.PoseName.Create(name).Value!.Key;

    [Fact]
    public async Task Add_Should_StoreThePendingProposalAndClearItsEvents_When_TheUnitOfWorkSaves()
    {
        var proposal = APendingProposal("Hand-to-Hand (L-base)");

        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            new EfPoseProposalRepository(context, aggregates).Add(proposal);
            await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
        }

        proposal.DomainEvents.ShouldBeEmpty();
        await using var assert = database.CreateDbContext();
        var stored = await assert.Set<PoseProposalRecord>().SingleAsync(p => p.Id == proposal.Id.Value, Ct);
        stored.ContributorId.ShouldBe(proposal.Contributor.Value);
        stored.Name.ShouldBe("Hand-to-Hand (L-base)");
        stored.NameKey.ShouldBe(proposal.Pose.Name.Key.Value);
        stored.BaseDifficulty.ShouldBe("intermediate");
        stored.FlyerDifficulty.ShouldBe("advanced");
        stored.CanStartFlow.ShouldBeFalse();
        stored.CanEndFlow.ShouldBeTrue();
        stored.Status.ShouldBe("pending");
        stored.SubmittedAt.ShouldBe(Now);
        stored.AcceptedBy.ShouldBeNull();
        stored.AcceptedAt.ShouldBeNull();
    }
}

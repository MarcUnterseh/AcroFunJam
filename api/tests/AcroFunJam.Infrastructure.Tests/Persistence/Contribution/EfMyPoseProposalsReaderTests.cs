using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

/// <summary>« Mes propositions » (story 5, ADR 0023): every proposal of a contributor, read from contribution.pose_proposals.</summary>
[Trait("Category", "Integration")]
public sealed class EfMyPoseProposalsReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task Save(params PoseProposal[] proposals)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseProposalRepository(context, aggregates);
        foreach (var proposal in proposals) repository.Add(proposal);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    private async Task<IReadOnlyList<PoseProposal>> ListSubmittedBy(ContributorId contributor)
    {
        await using var context = database.CreateDbContext();
        return await new EfMyPoseProposalsReader(context).ListSubmittedBy(contributor, Ct);
    }

    [Fact]
    public async Task ListSubmittedBy_Should_ReturnNothing_When_TheContributorHasNoProposal()
    {
        (await ListSubmittedBy(Alice.Id)).ShouldBeEmpty();
    }

    [Fact]
    public async Task ListSubmittedBy_Should_ReturnOnlyTheContributorProposals_When_OthersHaveProposed()
    {
        var chloe = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false);
        var throne = EfPoseProposalRepositoryTests.APendingProposal("Throne", Alice);
        var bird = EfPoseProposalRepositoryTests.APendingProposal("Bird", Alice);
        await Save(throne, bird, EfPoseProposalRepositoryTests.APendingProposal("Star", chloe));

        var mine = await ListSubmittedBy(Alice.Id);

        mine.Select(p => p.Id).ShouldBe([throne.Id, bird.Id], ignoreOrder: true);
    }

    [Fact]
    public async Task ListSubmittedBy_Should_RestoreEveryKindOfDecision_When_ProposalsWereDecided()
    {
        var decidedAt = new DateTimeOffset(2026, 11, 5, 10, 0, 0, TimeSpan.Zero);
        var bruno = new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true);
        var brunoProposing = new Contributor(new ContributorId(bruno.Id.Value), IsValidator: true);
        var pending = EfPoseProposalRepositoryTests.APendingProposal("Throne", Alice);
        var adjusted = EfPoseProposalRepositoryTests.APendingProposal("Hand-to-Hand (L-base)", Alice);
        adjusted.Accept(
            bruno, adjusted.Pose.Retain(PoseAdjustments.Create(null, null, null, null, canEndFlow: false).Value!),
            AdjustmentNote.Create("Le flyer ne redescend pas sans danger depuis cette pose.").Value, NameAvailability.Available, decidedAt);
        var rejected = EfPoseProposalRepositoryTests.APendingProposal("Front Bird", Alice);
        rejected.Reject(bruno, RejectionReason.Create("Doublon de Bird, déjà au catalogue.").Value!, decidedAt);
        var published = EfPoseProposalRepositoryTests.APendingProposal("Star", brunoProposing);
        await Save(pending, adjusted, rejected, published);

        var restored = (await ListSubmittedBy(Alice.Id)).Concat(await ListSubmittedBy(brunoProposing.Id)).ToDictionary(p => p.Id);

        restored.Count.ShouldBe(4);
        restored.ShouldSatisfyAllConditions(
            () => restored[pending.Id].Decision.ShouldBeNull(),
            () => restored[adjusted.Id].Decision.ShouldBe(adjusted.Decision),
            () => restored[rejected.Id].Decision.ShouldBe(rejected.Decision),
            () => restored[published.Id].Decision.ShouldBe(published.Decision));
    }
}

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
        stored.DecidedBy.ShouldBeNull();
        stored.DecidedAt.ShouldBeNull();
    }

    private async Task Save(params PoseProposal[] proposals)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseProposalRepository(context, aggregates);
        foreach (var proposal in proposals) repository.Add(proposal);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    private async Task<PoseProposal?> Load(PoseProposalId id)
    {
        await using var context = database.CreateDbContext();
        return await new EfPoseProposalRepository(context, new TrackedAggregates()).GetById(id, Ct);
    }

    [Fact]
    public async Task GetById_Should_RehydrateAPendingProposal_When_ItExists()
    {
        var proposal = APendingProposal("Hand-to-Hand (L-base)");
        await Save(proposal);

        var loaded = await Load(proposal.Id);

        loaded.ShouldNotBeNull();
        loaded.ShouldSatisfyAllConditions(
            () => loaded.Id.ShouldBe(proposal.Id),
            () => loaded.Contributor.ShouldBe(proposal.Contributor),
            () => loaded.Pose.ShouldBe(proposal.Pose),
            () => loaded.SubmittedAt.ShouldBe(Now),
            () => loaded.Decision.ShouldBeNull(),
            () => loaded.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public async Task GetById_Should_ReturnNull_When_TheProposalDoesNotExist()
    {
        await Save(APendingProposal("Throne"));

        (await Load(new PoseProposalId(Guid.NewGuid()))).ShouldBeNull();
    }

    private static readonly DateTimeOffset DecidedAt = Now.AddHours(2);

    private static Validator AValidator() => new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    /// <summary>Loads the proposal, lets it decide, then records the decision, as the decision use cases do.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Decide(PoseProposalId id, Action<PoseProposal> decide)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseProposalRepository(context, aggregates);
        var proposal = (await repository.GetById(id, Ct))!;
        decide(proposal);
        repository.Update(proposal);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<PoseProposalRecord> Stored(PoseProposalId id)
    {
        await using var context = database.CreateDbContext();
        return await context.Set<PoseProposalRecord>().AsNoTracking().SingleAsync(p => p.Id == id.Value, Ct);
    }

    [Fact]
    public async Task Update_Should_StoreTheAcceptanceAndItsValidator_When_APendingProposalIsAccepted()
    {
        var proposal = APendingProposal("Throne");
        await Save(proposal);
        var bruno = AValidator();

        await Decide(proposal.Id, p => p.Accept(bruno, DecidedAt));

        var stored = await Stored(proposal.Id);
        stored.ShouldSatisfyAllConditions(
            () => stored.Status.ShouldBe("accepted"),
            () => stored.DecidedBy.ShouldBe(bruno.Id.Value),
            () => stored.DecidedAt.ShouldBe(DecidedAt));
    }

    private static RejectionReason AReason(string reason) => RejectionReason.Create(reason).Value!;

    [Fact]
    public async Task Update_Should_StoreTheRejectionAndItsReason_When_APendingProposalIsRejected()
    {
        var proposal = APendingProposal("Throne");
        await Save(proposal);
        var bruno = AValidator();

        await Decide(proposal.Id, p => p.Reject(bruno, AReason("Doublon de Chair"), DecidedAt));

        var stored = await Stored(proposal.Id);
        stored.ShouldSatisfyAllConditions(
            () => stored.Status.ShouldBe("rejected"),
            () => stored.DecidedBy.ShouldBe(bruno.Id.Value),
            () => stored.DecidedAt.ShouldBe(DecidedAt),
            () => stored.RejectionReason.ShouldBe("Doublon de Chair"));
    }

    [Fact]
    public async Task GetById_Should_RehydrateTheDecision_When_TheProposalWasRejected()
    {
        var proposal = APendingProposal("Throne");
        await Save(proposal);
        var bruno = AValidator();
        await Decide(proposal.Id, p => p.Reject(bruno, AReason("Doublon de Chair"), DecidedAt));

        var loaded = await Load(proposal.Id);

        loaded!.Decision.ShouldBe(new Rejection(bruno.Id, DecidedAt, AReason("Doublon de Chair")));
    }

    [Fact]
    public async Task ExistsPendingWithNameKey_Should_BeFalse_When_TheProposalWithThisNameWasRejected()
    {
        var proposal = APendingProposal("Throne");
        await Save(proposal);
        await Decide(proposal.Id, p => p.Reject(AValidator(), AReason("Doublon de Chair"), DecidedAt));

        await using var context = database.CreateDbContext();
        (await new EfPoseProposalRepository(context, new TrackedAggregates()).ExistsPendingWithNameKey(Key("Throne"), Ct)).ShouldBeFalse();
    }
}

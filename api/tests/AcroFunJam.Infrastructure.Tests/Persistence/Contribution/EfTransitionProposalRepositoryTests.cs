using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

/// <summary>Storage of the transition proposals (story 7, ADR 0028).</summary>
[Trait("Category", "Integration")]
public sealed class EfTransitionProposalRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<TransitionProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    internal static TransitionProposal APendingProposal(string? name = "Ninja Star", string? description = null, TagSet? tags = null)
    {
        var star = Guid.NewGuid();
        return TransitionProposal.Submit(
            new TransitionProposalId(Guid.NewGuid()),
            new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false),
            TransitionPoses.Create(star, star).Value!,
            ProposedTransition.Create(name, "advanced", "intermediate", description).Value!,
            fromPosePublished: true,
            toPosePublished: true,
            TransitionSlotAvailability.Available,
            Now,
            new TagChoice(tags ?? TagSet.Empty, TagSet.Empty)).Value!;
    }

    private async Task Save(params TransitionProposal[] proposals)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTransitionProposalRepository(context, aggregates);
        foreach (var proposal in proposals) repository.Add(proposal);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    private async Task<TransitionProposal?> Restored(TransitionProposalId id)
    {
        await using var context = database.CreateDbContext();
        return await new EfTransitionProposalRepository(context, new TrackedAggregates()).GetById(id, Ct);
    }

    [Fact]
    public async Task GetById_Should_RestoreThePendingProposal_When_ItWasAdded()
    {
        var proposal = APendingProposal(description: "Rotation complète,  retour en Star.\nVidéo : https://example.org");

        await Save(proposal);

        proposal.DomainEvents.ShouldBeEmpty();
        (await Restored(proposal.Id)).ShouldNotBeNull().ShouldSatisfyAllConditions(
            p => p.Contributor.ShouldBe(proposal.Contributor),
            p => p.Poses.ShouldBe(proposal.Poses),
            p => p.Proposed.ShouldBe(proposal.Proposed),
            p => p.SubmittedAt.ShouldBe(Now),
            p => p.Status.ShouldBe(ProposalStatus.Pending));
    }

    [Fact]
    public async Task GetById_Should_RestoreATransitionWithoutNameNorDescription_When_NoneWasGiven()
    {
        var proposal = APendingProposal(name: null);

        await Save(proposal);

        (await Restored(proposal.Id)).ShouldNotBeNull().Proposed.ShouldBe(proposal.Proposed);
    }

    /// <summary>The same couple of poses as <paramref name="other"/>, so that both compete for the places between them.</summary>
    private static TransitionProposal Between(TransitionProposal other, string? name) =>
        TransitionProposal.Rehydrate(
            new TransitionProposalId(Guid.NewGuid()), new ContributorId(Guid.NewGuid()), other.Poses,
            ProposedTransition.Create(name, "beginner", "beginner", description: null).Value!, Now);

    private async Task<AcroFunJam.Domain.Common.Result<bool>> TrySave(TransitionProposal proposal)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfTransitionProposalRepository(context, aggregates).Add(proposal);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task ExistsPendingInSlot_Should_FindOnlyThePlaceTaken_When_APendingProposalTakesIt()
    {
        var named = APendingProposal(name: "Ninja Star");
        await Save(named);

        await using var context = database.CreateDbContext();
        var proposals = new EfTransitionProposalRepository(context, new TrackedAggregates());
        (await proposals.ExistsPendingInSlot(TransitionSlot.Of(named.Poses, TransitionName.CreateOptional("ninja-star").Value), Ct)).ShouldBeTrue();
        (await proposals.ExistsPendingInSlot(TransitionSlot.Of(named.Poses, name: null), Ct)).ShouldBeFalse();
        var otherPoses = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;
        (await proposals.ExistsPendingInSlot(TransitionSlot.Of(otherPoses, named.Proposed.Name), Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task ExistsPendingInSlot_Should_FindTheUnnamedPlace_When_AnUnnamedProposalIsPending()
    {
        var unnamed = APendingProposal(name: null);
        await Save(unnamed);

        await using var context = database.CreateDbContext();
        (await new EfTransitionProposalRepository(context, new TrackedAggregates()).ExistsPendingInSlot(unnamed.Slot, Ct)).ShouldBeTrue();
    }

    /// <summary>ADR 0029: two partial unique indexes, one per kind of place, each with its own business error.</summary>
    [Fact]
    public async Task SaveChanges_Should_FailWithUnnamedTransitionAlreadyPending_When_TwoPendingProposalsTakeTheUnnamedPlace()
    {
        var first = APendingProposal(name: null);
        await Save(first);

        (await TrySave(Between(first, name: null))).Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyPending);
    }

    [Fact]
    public async Task SaveChanges_Should_FailWithTransitionNameAlreadyPending_When_TwoPendingProposalsTakeTheSameName()
    {
        var first = APendingProposal(name: "Ninja Star");
        await Save(first);

        (await TrySave(Between(first, name: "NINJA STAR"))).Error.ShouldBe(ContributionErrors.TransitionNameAlreadyPending);
    }

    [Fact]
    public async Task SaveChanges_Should_AcceptBothProposals_When_OneIsNamedAndTheOtherUnnamed()
    {
        var first = APendingProposal(name: null);
        await Save(first);

        (await TrySave(Between(first, name: "Ninja Star"))).IsSuccess.ShouldBeTrue();
    }

    /// <summary>R2 (ADR 0023): a direct publication is stored as a fact, and restored as such.</summary>
    [Fact]
    public async Task GetById_Should_RestoreTheDirectPublication_When_AValidatorProposedTheTransition()
    {
        var star = Guid.NewGuid();
        var published = TransitionProposal.Submit(
            new TransitionProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true),
            TransitionPoses.Create(star, star).Value!, ProposedTransition.Create("Ninja Star", "advanced", "advanced", "Rotation.").Value!,
            fromPosePublished: true, toPosePublished: true, TransitionSlotAvailability.Available, Now).Value!;

        await Save(published);

        var restored = (await Restored(published.Id)).ShouldNotBeNull();
        restored.Status.ShouldBe(ProposalStatus.Accepted);
        restored.Decision.ShouldBe(published.Decision);
    }

    /// <summary>An accepted proposal no longer takes a place among the pending ones: the catalog takes it over.</summary>
    [Fact]
    public async Task ExistsPendingInSlot_Should_IgnoreTheDirectPublication_When_AValidatorProposedTheTransition()
    {
        var star = Guid.NewGuid();
        var published = TransitionProposal.Submit(
            new TransitionProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true),
            TransitionPoses.Create(star, star).Value!, ProposedTransition.Create(null, "advanced", "advanced", null).Value!,
            fromPosePublished: true, toPosePublished: true, TransitionSlotAvailability.Available, Now).Value!;
        await Save(published);

        await using var context = database.CreateDbContext();
        (await new EfTransitionProposalRepository(context, new TrackedAggregates()).ExistsPendingInSlot(published.Slot, Ct)).ShouldBeFalse();
    }

    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly DateTimeOffset Later = Now.AddDays(1);

    /// <summary>Loads the proposal, decides on it, then records the decision in a fresh context, as a use case does.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Decide(TransitionProposalId id, Action<TransitionProposal> decide)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTransitionProposalRepository(context, aggregates);
        var proposal = (await repository.GetById(id, Ct))!;
        decide(proposal);
        repository.Update(proposal);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task Update_Should_RecordTheAcceptanceWithItsRetainedTransition_When_TheUnitOfWorkSaves()
    {
        var proposal = APendingProposal(name: "ninja star", description: "Vidéo.");
        await Save(proposal);
        var adjustments = TransitionAdjustments.Create("Ninja Star", baseDifficulty: null, "advanced", description: "").Value!;
        var note = AdjustmentNote.Create("Le nom d'usage prend des majuscules.").Value;

        (await Decide(proposal.Id, p => p.Accept(Bruno, adjustments, note, TransitionSlotAvailability.Available, Later))).IsSuccess.ShouldBeTrue();

        var restored = (await Restored(proposal.Id))!;
        restored.Status.ShouldBe(ProposalStatus.Accepted);
        restored.Decision.ShouldBe(TransitionAcceptance.Of(proposal.Proposed, proposal.Proposed.Retain(adjustments), note, Bruno.Id, Later).Value);
    }

    [Fact]
    public async Task Update_Should_RecordTheRejectionWithItsReason_When_TheUnitOfWorkSaves()
    {
        var proposal = APendingProposal();
        await Save(proposal);
        var reason = RejectionReason.Create("Cette transition arrive en Bird, pas en Star : propose-la vers Bird.").Value!;

        (await Decide(proposal.Id, p => p.Reject(Bruno, reason, Later))).IsSuccess.ShouldBeTrue();

        (await Restored(proposal.Id))!.Decision.ShouldBe(new Rejection(Bruno.Id, Later, reason));
    }

    /// <summary>The status is the concurrency token of the record (ADR 0022): a second decision finds it no longer pending.</summary>
    [Fact]
    public async Task Update_Should_FailWithProposalAlreadyDecided_When_TheProposalWasDecidedSinceItWasLoaded()
    {
        var proposal = APendingProposal();
        await Save(proposal);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTransitionProposalRepository(context, aggregates);
        var stale = (await repository.GetById(proposal.Id, Ct))!;
        (await Decide(proposal.Id, p => p.Accept(Bruno, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Later))).IsSuccess.ShouldBeTrue();

        stale.Reject(Bruno, RejectionReason.Create("Trop tard.").Value!, Later);
        repository.Update(stale);

        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    [Fact]
    public async Task ExistsOtherPendingInSlot_Should_LeaveTheGivenProposalOut_When_ItTakesThePlace()
    {
        var proposal = APendingProposal();
        await Save(proposal);

        await using var context = database.CreateDbContext();
        var proposals = new EfTransitionProposalRepository(context, new TrackedAggregates());
        (await proposals.ExistsOtherPendingInSlot(proposal.Slot, proposal.Id, Ct)).ShouldBeFalse();
        (await proposals.ExistsOtherPendingInSlot(proposal.Slot, new TransitionProposalId(Guid.NewGuid()), Ct)).ShouldBeTrue();
    }

    /// <summary>R19: a rejected proposal frees its place.</summary>
    [Fact]
    public async Task PendingReader_Should_ListAndCountThePendingProposalsOnly_When_SomeAreDecided()
    {
        var pending = APendingProposal();
        var rejected = APendingProposal();
        await Save(pending, rejected);
        await Decide(rejected.Id, p => p.Reject(Bruno, RejectionReason.Create("Doublon.").Value!, Later));

        await using var context = database.CreateDbContext();
        var reader = new EfPendingTransitionProposalsReader(context);
        (await reader.ListPending(Ct)).Select(p => p.Id).ShouldBe([pending.Id]);
        (await reader.CountPending(Ct)).ShouldBe(1);
        (await new EfTransitionProposalRepository(context, new TrackedAggregates()).ExistsPendingInSlot(rejected.Slot, Ct)).ShouldBeFalse();
    }

    /// <summary>R21: every proposal of the contributor, whatever its status, and only theirs.</summary>
    [Fact]
    public async Task MyReader_Should_ListEveryProposalOfTheContributorOnly_When_SomeAreDecided()
    {
        var pending = APendingProposal();
        var rejected = TransitionProposal.Rehydrate(
            new TransitionProposalId(Guid.NewGuid()), pending.Contributor, pending.Poses,
            ProposedTransition.Create(null, "beginner", "beginner", null).Value!, Now);
        await Save(pending, rejected, APendingProposal());
        await Decide(rejected.Id, p => p.Reject(Bruno, RejectionReason.Create("Doublon.").Value!, Later));

        await using var context = database.CreateDbContext();
        var mine = await new EfMyTransitionProposalsReader(context).ListSubmittedBy(pending.Contributor, Ct);

        mine.Select(p => (p.Id, p.Status)).ShouldBe([(pending.Id, ProposalStatus.Pending), (rejected.Id, ProposalStatus.Rejected)], ignoreOrder: true);
    }

    [Fact]
    public async Task GetById_Should_ReturnNull_When_NoProposalHasTheId()
    {
        (await Restored(new TransitionProposalId(Guid.NewGuid()))).ShouldBeNull();
    }

    // --- Tags (story 8, ADR 0033) -------------------------------------------------------------

    private static readonly TagId Pop = new(Guid.NewGuid());
    private static readonly TagId Dynamic = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());

    [Fact]
    public async Task GetById_Should_RestoreTheProposedTags_When_ThePendingProposalCarriesSome()
    {
        var proposal = APendingProposal(tags: TagSet.Of([Pop, Dynamic]));
        await Save(proposal);

        (await Restored(proposal.Id))!.Proposed.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public async Task Update_Should_RecordTheRetainedTags_When_AcceptedWithOtherTags()
    {
        var proposal = APendingProposal(tags: TagSet.Of([Pop, Dynamic, Inversion]));
        await Save(proposal);
        var retained = new TagChoice(TagSet.Of([Pop, Dynamic]), TagSet.Empty);

        (await Decide(proposal.Id, p => p.Accept(Bruno, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Later, retained)))
            .IsSuccess.ShouldBeTrue();

        var acceptance = (TransitionAcceptance)(await Restored(proposal.Id))!.Decision!;
        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        acceptance.HasAdjustments.ShouldBeTrue();
    }
}


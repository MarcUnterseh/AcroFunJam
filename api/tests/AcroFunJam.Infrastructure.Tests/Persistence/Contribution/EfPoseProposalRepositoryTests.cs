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

        await Decide(proposal.Id, p => p.Accept(bruno, p.Pose.Retain(PoseAdjustments.None), null, NameAvailability.Available, DecidedAt));

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

    private static void AcceptWithAdjustments(PoseProposal proposal, Validator by, string note) =>
        proposal.Accept(
            by,
            proposal.Pose.Retain(PoseAdjustments.Create("THRONE", "beginner", flyerDifficulty: null, canStartFlow: true, canEndFlow: false).Value!),
            AdjustmentNote.Create(note).Value,
            NameAvailability.Available,
            DecidedAt).IsSuccess.ShouldBeTrue();

    [Fact]
    public async Task Update_Should_StoreTheRetainedPoseAndTheNote_When_AcceptedWithAdjustments()
    {
        var proposal = APendingProposal("Throne"); // intermediate / advanced, cannot start, can end
        await Save(proposal);

        await Decide(proposal.Id, p => AcceptWithAdjustments(p, AValidator(), "Descente dangereuse."));

        var stored = await Stored(proposal.Id);
        stored.ShouldSatisfyAllConditions(
            () => stored.Status.ShouldBe("accepted"),
            () => stored.Name.ShouldBe("Throne"),
            () => stored.BaseDifficulty.ShouldBe("intermediate"),
            () => stored.RetainedName.ShouldBe("THRONE"),
            () => stored.RetainedBaseDifficulty.ShouldBe("beginner"),
            () => stored.RetainedFlyerDifficulty.ShouldBe("advanced"),
            () => stored.RetainedCanStartFlow.ShouldBe(true),
            () => stored.RetainedCanEndFlow.ShouldBe(false),
            () => stored.AdjustmentNote.ShouldBe("Descente dangereuse."));
    }

    [Fact]
    public async Task GetById_Should_RehydrateTheRetainedPoseAndTheNote_When_TheProposalWasAcceptedWithAdjustments()
    {
        var proposal = APendingProposal("Throne");
        await Save(proposal);
        var bruno = AValidator();
        PoseProposal? decided = null;
        await Decide(proposal.Id, p =>
        {
            AcceptWithAdjustments(p, bruno, "Descente dangereuse.");
            decided = p;
        });

        var loaded = await Load(proposal.Id);

        var acceptance = loaded.ShouldNotBeNull().Decision.ShouldBeOfType<Acceptance>();
        acceptance.ShouldBe(decided.ShouldNotBeNull().Decision);
        acceptance.HasAdjustments.ShouldBeTrue();
    }

    [Fact]
    public async Task ExistsOtherPendingWithNameKey_Should_IgnoreTheProposalItself_When_ItIsTheOnlyPendingOneWithTheKey()
    {
        var throne = APendingProposal("throne");
        await Save(throne);

        await using var context = database.CreateDbContext();
        var proposals = new EfPoseProposalRepository(context, new TrackedAggregates());
        (await proposals.ExistsOtherPendingWithNameKey(Key("Throne"), except: throne.Id, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task ExistsOtherPendingWithNameKey_Should_BeTrue_When_AnotherPendingProposalHasTheKey()
    {
        var starr = APendingProposal("Starr");
        await Save(starr, APendingProposal("Star"));

        await using var context = database.CreateDbContext();
        var proposals = new EfPoseProposalRepository(context, new TrackedAggregates());
        (await proposals.ExistsOtherPendingWithNameKey(Key("STAR"), except: starr.Id, Ct)).ShouldBeTrue();
    }

    private static Contributor AValidatorProposing() => new(new ContributorId(Guid.NewGuid()), IsValidator: true);

    [Fact]
    public async Task Add_Should_StorePublishedDirectly_When_TheProposalIsADirectPublication()
    {
        var published = APendingProposal("Throne", AValidatorProposing()); // accepted at once (ADR 0023)

        await Save(published);

        var stored = await Stored(published.Id);
        stored.ShouldSatisfyAllConditions(
            () => stored.Status.ShouldBe("accepted"),
            () => stored.PublishedDirectly.ShouldBeTrue());
    }

    [Fact]
    public async Task GetById_Should_RestoreADirectPublication_When_StoredAsSuch()
    {
        var published = APendingProposal("Throne", AValidatorProposing());
        await Save(published);

        var loaded = await Load(published.Id);

        loaded.ShouldNotBeNull().Decision.ShouldBe(published.Decision);
        loaded.Decision.ShouldBeOfType<Acceptance>().IsDirectPublication.ShouldBeTrue();
    }

    /// <summary>Story 4, R17, with a frozen clock: decided by the contributor at the instant of the submission, yet no direct publication.</summary>
    [Fact]
    public async Task GetById_Should_RestoreAnAcceptanceNotDirect_When_TheContributorPromotedSinceAcceptedAtTheSameInstant()
    {
        var alice = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false);
        var proposal = APendingProposal("Throne", alice);
        await Save(proposal);
        var alicePromoted = new Validator(alice.Id.AsValidator(), CanDecide: true);
        await Decide(proposal.Id, p => p.Accept(alicePromoted, p.Pose.Retain(PoseAdjustments.None), null, NameAvailability.Available, Now));

        var loaded = await Load(proposal.Id);

        var acceptance = loaded.ShouldNotBeNull().Decision.ShouldBeOfType<Acceptance>();
        acceptance.ShouldSatisfyAllConditions(
            () => acceptance.By.ShouldBe(alicePromoted.Id),
            () => acceptance.At.ShouldBe(loaded.SubmittedAt),
            () => acceptance.IsDirectPublication.ShouldBeFalse());
    }

    /// <summary>
    /// The check constraint forbids such a row (ADR 0023): it is dropped in a transaction rolled back at the end, to check that
    /// the adapter translates the stored decision as is, for the rehydration to refuse it, instead of rebuilding it from the flag.
    /// </summary>
    [Fact]
    public async Task GetById_Should_ReportABug_When_PublishedDirectlyWithAnotherDecider()
    {
        var published = APendingProposal("Throne", AValidatorProposing());
        await Save(published);
        await using var context = database.CreateDbContext();
        await using var transaction = await context.Database.BeginTransactionAsync(Ct);
        await context.Database.ExecuteSqlRawAsync(
            "ALTER TABLE contribution.pose_proposals DROP CONSTRAINT ck_pose_proposals_published_directly", Ct);
        await context.Database.ExecuteSqlAsync(
            $"UPDATE contribution.pose_proposals SET decided_by = {Guid.NewGuid()} WHERE id = {published.Id.Value}", Ct);

        var bug = await Should.ThrowAsync<InvalidOperationException>(
            () => new EfPoseProposalRepository(context, new TrackedAggregates()).GetById(published.Id, Ct));

        bug.Message.ShouldSatisfyAllConditions(
            () => bug.Message.ShouldContain("direct publication"),
            () => bug.Message.ShouldContain(published.Id.Value.ToString()));
    }

    // --- Story 9a: the tags of a proposed pose (ADR 0036) ------------------------------------------

    private static readonly AcroFunJam.Domain.SharedKernel.TagId Lunar = new(Guid.NewGuid());
    private static readonly AcroFunJam.Domain.SharedKernel.TagId Inversion = new(Guid.NewGuid());

    private static PoseProposal ATaggedProposal(string name, params AcroFunJam.Domain.SharedKernel.TagId[] tags) =>
        PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false),
            ProposedPose.Create(name, "beginner", "discovery", false, true).Value!, NameAvailability.Available, Now,
            new AcroFunJam.Domain.SharedKernel.TagChoice(AcroFunJam.Domain.SharedKernel.TagSet.Of(tags), AcroFunJam.Domain.SharedKernel.TagSet.Empty)).Value!;

    [Fact]
    public async Task GetById_Should_RestoreTheProposedTags_When_TheProposalCarriesSome()
    {
        var proposal = ATaggedProposal("Folded Leaf", Lunar, Inversion);
        await Save(proposal);

        (await Load(proposal.Id))!.Pose.Tags.ShouldBe(AcroFunJam.Domain.SharedKernel.TagSet.Of([Lunar, Inversion]));
    }

    [Fact]
    public async Task Update_Should_RecordTheRetainedTagsAndANote_When_AcceptedWithOtherTagsOnly()
    {
        var proposal = ATaggedProposal("Candlestick", Lunar, Inversion);
        await Save(proposal);

        (await Decide(proposal.Id, p => p.Accept(AValidator(), p.Pose.Retain(PoseAdjustments.None), AdjustmentNote.Create("Pas lunaire.").Value,
            NameAvailability.Available, DecidedAt, new AcroFunJam.Domain.SharedKernel.TagChoice(
                AcroFunJam.Domain.SharedKernel.TagSet.Of([Inversion]), AcroFunJam.Domain.SharedKernel.TagSet.Empty)).IsSuccess.ShouldBeTrue()))
            .IsSuccess.ShouldBeTrue();

        var acceptance = (await Load(proposal.Id))!.Decision.ShouldBeOfType<Acceptance>();
        acceptance.Retained.Tags.ShouldBe(AcroFunJam.Domain.SharedKernel.TagSet.Of([Inversion]));
        acceptance.HasAdjustments.ShouldBeTrue();
    }

    [Fact]
    public async Task Add_Should_StoreTheTagsOfADirectPublication_When_AValidatorProposes()
    {
        var proposal = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true),
            ProposedPose.Create("Straddle Bat", "intermediate", "intermediate", false, true).Value!, NameAvailability.Available, Now,
            new AcroFunJam.Domain.SharedKernel.TagChoice(AcroFunJam.Domain.SharedKernel.TagSet.Of([Lunar]), AcroFunJam.Domain.SharedKernel.TagSet.Empty)).Value!;

        await Save(proposal);

        (await Load(proposal.Id))!.Decision.ShouldBeOfType<Acceptance>().Retained.Tags.ShouldBe(AcroFunJam.Domain.SharedKernel.TagSet.Of([Lunar]));
    }
}

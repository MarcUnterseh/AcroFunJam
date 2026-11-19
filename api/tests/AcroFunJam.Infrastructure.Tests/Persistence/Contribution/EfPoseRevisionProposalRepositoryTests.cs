using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Contribution;

/// <summary>Storage of the pose revision proposals (story 6, ADR 0026).</summary>
[Trait("Category", "Integration")]
public sealed class EfPoseRevisionProposalRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseRevisionProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    internal static PoseRevisionProposal APendingRevision(string? flyerDifficulty = "discovery", string? name = null, string? message = null)
    {
        var throne = new PublishedPose(
            new PublishedPoseId(Guid.NewGuid()),
            new PriorPose(
                PoseName.Create("Throne").Value!,
                Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
                FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!),
            new PublishedPoseVersion(3));
        return PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()),
            new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false),
            throne,
            throne.Version,
            PoseChanges.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!,
            RevisionMessage.Create(message).Value,
            revisionAlreadyPending: false,
            NameAvailability.Available,
            Now).Value!;
    }

    [Fact]
    public async Task GetById_Should_RestoreThePendingRevision_When_ItWasAdded()
    {
        var revision = APendingRevision();
        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            new EfPoseRevisionProposalRepository(context, aggregates).Add(revision);
            (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using var assert = database.CreateDbContext();
        var restored = await new EfPoseRevisionProposalRepository(assert, new TrackedAggregates()).GetById(revision.Id, Ct);

        revision.DomainEvents.ShouldBeEmpty();
        restored.ShouldNotBeNull().ShouldSatisfyAllConditions(
            r => r.Contributor.ShouldBe(revision.Contributor),
            r => r.Pose.ShouldBe(revision.Pose),
            r => r.BaseVersion.ShouldBe(revision.BaseVersion),
            r => r.Revision.ShouldBe(revision.Revision),
            r => r.SubmittedAt.ShouldBe(Now),
            r => r.Status.ShouldBe(ProposalStatus.Pending));
    }

    private async Task<AcroFunJam.Domain.Common.Result<bool>> Save(params PoseRevisionProposal[] revisions)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRevisionProposalRepository(context, aggregates);
        foreach (var revision in revisions) repository.Add(revision);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task ExistsPendingWithReservedNameKey_Should_FindOnlyPendingRevisionsThatRename_When_TheKeyMatches()
    {
        await Save(APendingRevision(flyerDifficulty: null, name: "High Throne"), APendingRevision(flyerDifficulty: null, name: "THRONE"));

        await using var context = database.CreateDbContext();
        var revisions = new EfPoseRevisionProposalRepository(context, new TrackedAggregates());
        (await revisions.ExistsPendingWithReservedNameKey(PoseName.Create("high-throne").Value!.Key, Ct)).ShouldBeTrue();
        (await revisions.ExistsPendingWithReservedNameKey(PoseName.Create("Throne").Value!.Key, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task ExistsOtherPendingWithReservedNameKey_Should_LeaveTheGivenRevisionOut_When_ItReservesTheKey()
    {
        var renaming = APendingRevision(flyerDifficulty: null, name: "High Throne");
        await Save(renaming);
        var key = PoseName.Create("high-throne").Value!.Key;

        await using var context = database.CreateDbContext();
        var revisions = new EfPoseRevisionProposalRepository(context, new TrackedAggregates());
        (await revisions.ExistsOtherPendingWithReservedNameKey(key, renaming.Id, Ct)).ShouldBeFalse();
        (await revisions.ExistsOtherPendingWithReservedNameKey(key, new PoseRevisionProposalId(Guid.NewGuid()), Ct)).ShouldBeTrue();
    }

    [Fact]
    public async Task SaveChanges_Should_FailWithPoseNameAlreadyPending_When_TwoPendingRevisionsReserveTheSameKey()
    {
        (await Save(APendingRevision(flyerDifficulty: null, name: "High Throne"))).IsSuccess.ShouldBeTrue();

        var saved = await Save(APendingRevision(flyerDifficulty: null, name: "high-throne"));

        saved.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task ExistsPendingForPose_Should_BeTrueOnlyForThatPose_When_ThePoseHasAPendingRevision()
    {
        var revision = APendingRevision();
        await Save(revision);

        await using var context = database.CreateDbContext();
        var revisions = new EfPoseRevisionProposalRepository(context, new TrackedAggregates());
        (await revisions.ExistsPendingForPose(revision.Pose, Ct)).ShouldBeTrue();
        (await revisions.ExistsPendingForPose(new PublishedPoseId(Guid.NewGuid()), Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task GetPendingForPose_Should_RestoreThePendingRevisionOfThatPoseOnly_When_ThePoseHasOne()
    {
        var revision = APendingRevision();
        await Save(revision);

        await using var context = database.CreateDbContext();
        var revisions = new EfPoseRevisionProposalRepository(context, new TrackedAggregates());
        (await revisions.GetPendingForPose(revision.Pose, Ct))!.Id.ShouldBe(revision.Id);
        (await revisions.GetPendingForPose(new PublishedPoseId(Guid.NewGuid()), Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task GetPendingForPose_Should_ReturnNull_When_TheRevisionOfThePoseIsDecided()
    {
        var revision = APendingRevision();
        await Save(revision);
        await Decide(revision.Id, p => p.Reject(Bruno, RejectionReason.Create("Throne reste intermédiaire.").Value!, Later));

        await using var context = database.CreateDbContext();
        var revisions = new EfPoseRevisionProposalRepository(context, new TrackedAggregates());
        (await revisions.GetPendingForPose(revision.Pose, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task SaveChanges_Should_FailWithPoseRevisionAlreadyPending_When_ThePoseAlreadyHasAPendingRevision()
    {
        var first = APendingRevision();
        (await Save(first)).IsSuccess.ShouldBeTrue();
        var second = PoseRevisionProposal.Rehydrate(
            new PoseRevisionProposalId(Guid.NewGuid()), first.Contributor, first.Pose, first.BaseVersion, first.Revision, Now);

        var saved = await Save(second);

        saved.Error.ShouldBe(ContributionErrors.PoseRevisionAlreadyPending);
    }

    [Fact]
    public async Task GetById_Should_RestoreTheRevisionMessage_When_OneWasGiven()
    {
        var revision = APendingRevision(message: "Le flyer ne redescend pas sans danger.");
        await Save(revision);

        await using var context = database.CreateDbContext();
        var restored = await new EfPoseRevisionProposalRepository(context, new TrackedAggregates()).GetById(revision.Id, Ct);

        restored.ShouldNotBeNull().Message.ShouldBe(revision.Message);
    }

    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly DateTimeOffset Later = Now.AddDays(1);

    /// <summary>Loads the revision, decides on it, then records the decision in a fresh context, as a use case does.</summary>
    private async Task<AcroFunJam.Domain.Common.Result<bool>> Decide(PoseRevisionProposalId id, Action<PoseRevisionProposal> decide)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRevisionProposalRepository(context, aggregates);
        var proposal = (await repository.GetById(id, Ct))!;
        decide(proposal);
        repository.Update(proposal);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<PoseRevisionProposal> Restored(PoseRevisionProposalId id)
    {
        await using var context = database.CreateDbContext();
        return (await new EfPoseRevisionProposalRepository(context, new TrackedAggregates()).GetById(id, Ct))!;
    }

    [Fact]
    public async Task Update_Should_RecordTheAcceptanceWithItsRetainedPose_When_TheUnitOfWorkSaves()
    {
        var revision = APendingRevision();
        await Save(revision);
        var adjustments = PoseAdjustments.Create(name: null, baseDifficulty: "advanced", flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;
        var note = AdjustmentNote.Create("La base porte tout le poids.").Value;

        (await Decide(revision.Id, p => p.Accept(Bruno, adjustments, note, NameAvailability.Available, Later))).IsSuccess.ShouldBeTrue();

        var restored = await Restored(revision.Id);
        restored.Status.ShouldBe(ProposalStatus.Accepted);
        restored.Decision.ShouldBe(Acceptance.Of(revision.Revision.After, revision.Revision.After.Retain(adjustments), note, Bruno.Id, Later).Value);
    }

    [Fact]
    public async Task Update_Should_RecordTheRejectionWithItsReason_When_TheUnitOfWorkSaves()
    {
        var revision = APendingRevision();
        await Save(revision);
        var reason = RejectionReason.Create("Throne reste intermédiaire côté flyer.").Value!;

        (await Decide(revision.Id, p => p.Reject(Bruno, reason, Later))).IsSuccess.ShouldBeTrue();

        (await Restored(revision.Id)).Decision.ShouldBe(new Rejection(Bruno.Id, Later, reason));
    }

    /// <summary>The status is the concurrency token of the record (ADR 0022): a second decision finds it no longer pending.</summary>
    [Fact]
    public async Task Update_Should_FailWithProposalAlreadyDecided_When_TheRevisionWasDecidedSinceItWasLoaded()
    {
        var revision = APendingRevision();
        await Save(revision);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRevisionProposalRepository(context, aggregates);
        var stale = (await repository.GetById(revision.Id, Ct))!;
        (await Decide(revision.Id, p => p.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later))).IsSuccess.ShouldBeTrue();

        stale.Reject(Bruno, RejectionReason.Create("Trop tard.").Value!, Later);
        repository.Update(stale);
        var saved = await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);

        saved.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    // --- Story 9a: the tags of the pose before, proposed and retained (ADR 0036) -------------------

    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());

    private static TagChoice Chosen(params TagId[] tags) => new(TagSet.Of(tags), TagSet.Empty);

    private static PoseRevisionProposal ARetaggingRevision(bool byAValidator = false)
    {
        var foldedLeaf = new PublishedPose(
            new PublishedPoseId(Guid.NewGuid()),
            new PriorPose(
                PoseName.Create("Folded Leaf").Value!,
                Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!,
                FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!) { Tags = TagSet.Of([Inversion]) },
            new PublishedPoseVersion(2));
        return PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()),
            new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: byAValidator),
            foldedLeaf,
            foldedLeaf.Version,
            PoseChanges.Create(null, null, null, null, null).Value!.Tagged(Chosen(Lunar, Inversion)),
            message: null,
            revisionAlreadyPending: false,
            NameAvailability.Available,
            Now).Value!;
    }

    [Fact]
    public async Task GetById_Should_RestoreTheTagsBeforeAndProposed_When_TheRevisionChangesTheTags()
    {
        var revision = ARetaggingRevision();
        await Save(revision);

        (await Restored(revision.Id)).Revision.ShouldSatisfyAllConditions(
            r => r.Before.Tags.ShouldBe(TagSet.Of([Inversion])),
            r => r.After.Tags.ShouldBe(TagSet.Of([Lunar, Inversion])));
    }

    [Fact]
    public async Task Update_Should_RecordTheRetainedTags_When_AcceptedWithOtherTagsOnly()
    {
        var revision = ARetaggingRevision();
        await Save(revision);

        (await Decide(revision.Id, p => p.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later, Chosen(Lunar))
            .IsSuccess.ShouldBeTrue())).IsSuccess.ShouldBeTrue();

        var acceptance = (await Restored(revision.Id)).Decision.ShouldBeOfType<Acceptance>();
        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Lunar]));
        acceptance.HasAdjustments.ShouldBeTrue();
    }

    [Fact]
    public async Task Add_Should_StoreTheTagsOfADirectPublication_When_AValidatorRevises()
    {
        var revision = ARetaggingRevision(byAValidator: true);

        (await Save(revision)).IsSuccess.ShouldBeTrue();

        (await Restored(revision.Id)).Decision.ShouldBeOfType<Acceptance>().Retained.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
    }
}

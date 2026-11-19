using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

[Trait("Category", "Integration")]
public sealed class EfPoseRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    internal static Pose APublishedPose(string name, SourceProposalId? source = null) =>
        Pose.Publish(
            new PoseId(Guid.NewGuid()),
            PoseName.Create(name).Value!,
            Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Advanced).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!,
            source,
            nameAlreadyPublished: false,
            Now).Value!;

    private async Task Save(params Pose[] poses)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRepository(context, aggregates);
        foreach (var pose in poses) repository.Add(pose);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Add_Should_StoreThePublishedPoseAndClearItsEvents_When_TheUnitOfWorkSaves()
    {
        var source = new SourceProposalId(Guid.NewGuid());
        var pose = APublishedPose("Hand-to-Hand (L-base)", source);

        await Save(pose);

        pose.DomainEvents.ShouldBeEmpty();
        await using var assert = database.CreateDbContext();
        var stored = await assert.Set<PoseRecord>().SingleAsync(p => p.Id == pose.Id.Value, Ct);
        stored.Name.ShouldBe("Hand-to-Hand (L-base)");
        stored.NameKey.ShouldBe(pose.Name.Key.Value);
        stored.BaseDifficulty.ShouldBe("intermediate");
        stored.FlyerDifficulty.ShouldBe("advanced");
        stored.CanStartFlow.ShouldBeTrue();
        stored.CanEndFlow.ShouldBeFalse();
        stored.SourceProposalId.ShouldBe(source.Value);
        stored.PublishedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task GetById_Should_RestoreThePoseWithItsVersion_When_ItWasSaved()
    {
        var pose = APublishedPose("Throne");
        await Save(pose);

        await using var context = database.CreateDbContext();
        var restored = await new EfPoseRepository(context, new TrackedAggregates()).GetById(pose.Id, Ct);

        restored.ShouldNotBeNull().ShouldSatisfyAllConditions(
            p => p.Name.ShouldBe(pose.Name),
            p => p.Difficulty.ShouldBe(pose.Difficulty),
            p => p.Flow.ShouldBe(pose.Flow),
            p => p.Version.ShouldBe(PoseVersion.Initial));
    }

    private async Task<AcroFunJam.Domain.Common.Result<bool>> Revise(PoseId id, string name, PoseVersion expected)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRepository(context, aggregates);
        var pose = (await repository.GetById(id, Ct))!;
        pose.Revise(
                PoseName.Create(name).Value!, pose.Difficulty, pose.Flow, expected, nameTakenByAnotherPose: false, new SourceProposalId(Guid.NewGuid()),
                Now)
            .IsSuccess.ShouldBeTrue();
        repository.Update(pose);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task Update_Should_StoreTheRevisedValuesAndVersion_When_TheUnitOfWorkSaves()
    {
        var pose = APublishedPose("Thron");
        await Save(pose);

        (await Revise(pose.Id, "Throne", PoseVersion.Initial)).IsSuccess.ShouldBeTrue();

        await using var assert = database.CreateDbContext();
        var stored = await assert.Set<PoseRecord>().SingleAsync(p => p.Id == pose.Id.Value, Ct);
        stored.Name.ShouldBe("Throne");
        stored.NameKey.ShouldBe(PoseName.Create("Throne").Value!.Key.Value);
        stored.Version.ShouldBe(2);
    }

    /// <summary>Two revisions read at the same version: the second one finds the pose changed (ADR 0024).</summary>
    [Fact]
    public async Task Update_Should_FailWithPoseVersionMismatch_When_ThePoseWasRevisedSinceItWasRead()
    {
        var pose = APublishedPose("Thron");
        await Save(pose);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseRepository(context, aggregates);
        var stale = (await repository.GetById(pose.Id, Ct))!;
        (await Revise(pose.Id, "Throne", PoseVersion.Initial)).IsSuccess.ShouldBeTrue();

        stale.Revise(
            PoseName.Create("Thrown").Value!, stale.Difficulty, stale.Flow, PoseVersion.Initial, nameTakenByAnotherPose: false,
            new SourceProposalId(Guid.NewGuid()), Now);
        repository.Update(stale);
        var saved = await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);

        saved.Error.ShouldBe(CatalogErrors.PoseVersionMismatch);
    }

    [Fact]
    public async Task GetById_Should_ReturnNull_When_NoPoseHasTheId()
    {
        await using var context = database.CreateDbContext();

        var restored = await new EfPoseRepository(context, new TrackedAggregates()).GetById(new PoseId(Guid.NewGuid()), Ct);

        restored.ShouldBeNull();
    }

    [Fact]
    public async Task IsNameTaken_Should_ReturnTrue_When_APublishedPoseHasTheNameKey()
    {
        await Save(APublishedPose("High Bird"));

        await using var context = database.CreateDbContext();
        var repository = new EfPoseRepository(context, new TrackedAggregates());

        (await repository.IsNameTaken(PoseName.Create("HIGH BIRD").Value!.Key, Ct)).ShouldBeTrue();
        (await repository.IsNameTaken(PoseName.Create("Bird").Value!.Key, Ct)).ShouldBeFalse();
    }

    /// <summary>Story 7 (ADR 0028): the current names of published poses in one batch, an unknown identifier left out.</summary>
    [Fact]
    public async Task NamesOf_Should_ReturnTheNamesOfThePublishedPosesOnly_When_SomeIdsAreUnknown()
    {
        var throne = APublishedPose("Throne");
        var bird = APublishedPose("Bird");
        await Save(throne, bird, APublishedPose("Star"));

        await using var context = database.CreateDbContext();
        var names = await new EfPoseRepository(context, new TrackedAggregates()).NamesOf([throne.Id, bird.Id, new PoseId(Guid.NewGuid())], Ct);

        names.ShouldBe(new Dictionary<PoseId, PoseName> { [throne.Id] = throne.Name, [bird.Id] = bird.Name }, ignoreOrder: true);
    }

    [Fact]
    public async Task Database_Should_RejectASecondPose_When_TheNameKeyIsAlreadyPublished()
    {
        await Save(APublishedPose("High Bird"));

        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseRepository(context, aggregates).Add(APublishedPose("high bird"));
        // Without the declared translation, the unique index itself refuses the pose.
        await Should.ThrowAsync<DbUpdateException>(() => new EfUnitOfWork(context, aggregates, [], []).SaveChanges(Ct));
    }

    // --- Story 9a: the tags of a pose (ADR 0036) -------------------------------------------------

    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());

    [Fact]
    public async Task GetById_Should_RestoreTheTagsOfThePose_When_ItWasPublishedWithSome()
    {
        var pose = Pose.Publish(new PoseId(Guid.NewGuid()), PoseName.Create("Folded Leaf").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!, FlowBoundaries.Create(false, true).Value!, null,
            nameAlreadyPublished: false, Now, new TagChoice(TagSet.Of([Lunar, Inversion]), TagSet.Empty)).Value!;
        await Save(pose);

        await using var context = database.CreateDbContext();
        var restored = await new EfPoseRepository(context, new TrackedAggregates()).GetById(pose.Id, Ct);

        restored.ShouldNotBeNull().Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
    }

    [Fact]
    public async Task Update_Should_StoreTheTagsAndTheVersion_When_ThePoseIsTagged()
    {
        var pose = APublishedPose("Candlestick");
        await Save(pose);

        await using (var context = database.CreateDbContext())
        {
            var aggregates = new TrackedAggregates();
            var repository = new EfPoseRepository(context, aggregates);
            var read = (await repository.GetById(pose.Id, Ct))!;
            read.Tag(new TagChoice(TagSet.Of([Inversion]), TagSet.Empty), revisionPending: false, Now).IsSuccess.ShouldBeTrue();
            repository.Update(read);
            (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        }

        await using var assert = database.CreateDbContext();
        var stored = await assert.Set<PoseRecord>().SingleAsync(p => p.Id == pose.Id.Value, Ct);
        stored.TagIds.ShouldBe([Inversion.Value]);
        stored.Version.ShouldBe(2);
    }
}

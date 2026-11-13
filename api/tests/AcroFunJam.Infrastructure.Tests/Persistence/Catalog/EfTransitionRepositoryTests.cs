using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

/// <summary>Storage of the published transitions and the page of a pose (story 7, ADR 0028 to 0030).</summary>
[Trait("Category", "Integration")]
public sealed class EfTransitionRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly Pose _throne = EfPoseRepositoryTests.APublishedPose("Throne");
    private readonly Pose _bird = EfPoseRepositoryTests.APublishedPose("Bird");
    private readonly Pose _star = EfPoseRepositoryTests.APublishedPose("Star");

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<TransitionRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
        var aggregates = new TrackedAggregates();
        var poses = new EfPoseRepository(context, aggregates);
        poses.Add(_throne);
        poses.Add(_bird);
        poses.Add(_star);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static Transition ATransition(Pose from, Pose to, string? name = null, string? description = null) =>
        Transition.Publish(
            new TransitionId(Guid.NewGuid()), from.Id, to.Id, TransitionName.CreateOptional(name).Value,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!, TransitionDescription.CreateOptional(description).Value,
            source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, Now).Value!;

    private async Task<AcroFunJam.Domain.Common.Result<bool>> Save(params Transition[] transitions)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfTransitionRepository(context, aggregates);
        foreach (var transition in transitions) repository.Add(transition);
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task IsSlotTaken_Should_FindOnlyThePlaceTaken_When_ATransitionIsPublished()
    {
        var ninjaStar = ATransition(_star, _star, "Ninja Star");
        (await Save(ninjaStar)).IsSuccess.ShouldBeTrue();
        ninjaStar.DomainEvents.ShouldBeEmpty();

        await using var context = database.CreateDbContext();
        var transitions = new EfTransitionRepository(context, new TrackedAggregates());
        (await transitions.IsSlotTaken(_star.Id, _star.Id, TransitionName.CreateOptional("NINJA-STAR").Value!.Key, Ct)).ShouldBeTrue();
        (await transitions.IsSlotTaken(_star.Id, _star.Id, nameKey: null, Ct)).ShouldBeFalse();
        (await transitions.IsSlotTaken(_throne.Id, _star.Id, ninjaStar.Name!.Key, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task SaveChanges_Should_FailWithUnnamedTransitionTaken_When_TwoUnnamedTransitionsLinkThePosesInTheSameDirection()
    {
        (await Save(ATransition(_throne, _bird))).IsSuccess.ShouldBeTrue();

        (await Save(ATransition(_throne, _bird))).Error.ShouldBe(CatalogErrors.UnnamedTransitionTaken);
        (await Save(ATransition(_bird, _throne))).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task SaveChanges_Should_FailWithTransitionNameTaken_When_TwoTransitionsTakeTheSameNameBetweenTheSamePoses()
    {
        (await Save(ATransition(_star, _star, "Ninja Star"))).IsSuccess.ShouldBeTrue();

        (await Save(ATransition(_star, _star, "ninja star"))).Error.ShouldBe(CatalogErrors.TransitionNameTaken);
    }

    [Fact]
    public async Task SaveChanges_Should_BeRefusedByTheForeignKey_When_APoseIsNotInTheCatalog()
    {
        var unknown = EfPoseRepositoryTests.APublishedPose("Folded Leaf"); // never saved

        await Should.ThrowAsync<DbUpdateException>(() => Save(ATransition(_throne, unknown)));
    }

    /// <summary>C1, C2, C4, C7: the other pose under its current name; a washing machine in both lists.</summary>
    [Fact]
    public async Task Reader_Should_PresentTheTransitionsFromAndToThePoseWithTheOtherPose_When_SomeArePublished()
    {
        var throneToStar = ATransition(_throne, _star, description: "Passe par Bird sans s'arrêter.");
        var ninjaStar = ATransition(_star, _star, "Ninja Star");
        var starToBird = ATransition(_star, _bird);
        (await Save(throneToStar, ninjaStar, starToBird, ATransition(_throne, _bird))).IsSuccess.ShouldBeTrue();

        await using var context = database.CreateDbContext();
        var reader = new EfPoseTransitionsReader(context);
        var from = await reader.TransitionsFrom(_star.Id, Ct);
        var to = await reader.TransitionsTo(_star.Id, Ct);

        from.ShouldBe([Linked(ninjaStar, _star), Linked(starToBird, _bird)], ignoreOrder: true);
        to.ShouldBe([Linked(throneToStar, _throne), Linked(ninjaStar, _star)], ignoreOrder: true);
    }

    private static LinkedTransition Linked(Transition transition, Pose other) =>
        new(transition.Id, other.Id, other.Name, transition.Name, transition.Difficulty, transition.Description);
}

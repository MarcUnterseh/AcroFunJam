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
    public async Task IsNameTaken_Should_ReturnTrue_When_APublishedPoseHasTheNameKey()
    {
        await Save(APublishedPose("High Bird"));

        await using var context = database.CreateDbContext();
        var repository = new EfPoseRepository(context, new TrackedAggregates());

        (await repository.IsNameTaken(PoseName.Create("HIGH BIRD").Value!.Key, Ct)).ShouldBeTrue();
        (await repository.IsNameTaken(PoseName.Create("Bird").Value!.Key, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task Database_Should_RejectASecondPose_When_TheNameKeyIsAlreadyPublished()
    {
        await Save(APublishedPose("High Bird"));

        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseRepository(context, aggregates).Add(APublishedPose("high bird"));
        // Without the declared translation, the unique index itself refuses the pose.
        await Should.ThrowAsync<DbUpdateException>(() => new EfUnitOfWork(context, aggregates, []).SaveChanges(Ct));
    }
}

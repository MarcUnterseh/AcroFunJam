using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

[Trait("Category", "Integration")]
public sealed class EfPublishedPosesReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    [Fact]
    public async Task GetPublishedPoses_Should_ThrowExplicitly_When_AStoredNameBreaksTheRules()
    {
        var ct = TestContext.Current.CancellationToken;
        await using (var arrangeContext = database.CreateDbContext())
        {
            await arrangeContext.Database.MigrateAsync(ct);
            await arrangeContext.Set<PoseRecord>().ExecuteDeleteAsync(ct);
            await arrangeContext.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO catalog.poses (id, name, name_key, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow, published_at)
                VALUES (gen_random_uuid(), '---', 'x', 'discovery', 'discovery', true, true, now())
                """, ct);
        }

        await using var context = database.CreateDbContext();

        var error = await Should.ThrowAsync<InvalidOperationException>(() => new EfPublishedPosesReader(context).GetPublishedPoses(ct));
        error.Message.ShouldContain("'---'");
        await context.Set<PoseRecord>().ExecuteDeleteAsync(ct);
    }

    [Fact]
    public async Task GetPublishedPoses_Should_ReturnStoredPoses_When_TableContainsPoses()
    {
        var ct = TestContext.Current.CancellationToken;
        Pose[] poses = [EfPoseRepositoryTests.APublishedPose("Bird"), EfPoseRepositoryTests.APublishedPose("Throne")];
        await using (var arrangeContext = database.CreateDbContext())
        {
            await arrangeContext.Database.MigrateAsync(ct);
            await arrangeContext.Set<PoseRecord>().ExecuteDeleteAsync(ct);
            var aggregates = new TrackedAggregates();
            var repository = new EfPoseRepository(arrangeContext, aggregates);
            foreach (var pose in poses) repository.Add(pose);
            await UnitOfWorks.For(arrangeContext, aggregates).SaveChanges(ct);
        }

        await using var context = database.CreateDbContext();
        var reader = new EfPublishedPosesReader(context);

        var published = await reader.GetPublishedPoses(ct);

        published.ShouldBe(
            poses.Select(p => new PublishedPoseSummary(
                p.Id, p.Name, DifficultyLevel.Intermediate, DifficultyLevel.Advanced, FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!)),
            ignoreOrder: true);
    }
}

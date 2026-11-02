using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Catalog;

[Trait("Category", "Integration")]
public sealed class EfPublishedPosesReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    [Fact]
    public async Task GetPublishedPoses_Should_ReturnStoredPoses_When_TableContainsPoses()
    {
        var ct = TestContext.Current.CancellationToken;
        var bird = new PoseRecord { Id = Guid.NewGuid(), Name = "Bird", BaseDifficulty = "discovery", FlyerDifficulty = "beginner" };
        var throne = new PoseRecord { Id = Guid.NewGuid(), Name = "Throne", BaseDifficulty = "beginner", FlyerDifficulty = "intermediate" };
        var star = new PoseRecord { Id = Guid.NewGuid(), Name = "Star", BaseDifficulty = "advanced", FlyerDifficulty = "advanced" };
        await using (var arrangeContext = database.CreateDbContext())
        {
            await arrangeContext.Database.MigrateAsync(ct);
            arrangeContext.Set<PoseRecord>().AddRange(bird, throne, star);
            await arrangeContext.SaveChangesAsync(ct);
        }

        await using var context = database.CreateDbContext();
        var reader = new EfPublishedPosesReader(context);

        var poses = await reader.GetPublishedPoses(ct);

        poses.ShouldBe(
            [
                new PublishedPoseSummary(new PoseId(bird.Id), new PoseName("Bird"), DifficultyLevel.Discovery, DifficultyLevel.Beginner),
                new PublishedPoseSummary(new PoseId(throne.Id), new PoseName("Throne"), DifficultyLevel.Beginner, DifficultyLevel.Intermediate),
                new PublishedPoseSummary(new PoseId(star.Id), new PoseName("Star"), DifficultyLevel.Advanced, DifficultyLevel.Advanced),
            ],
            ignoreOrder: true);
    }
}

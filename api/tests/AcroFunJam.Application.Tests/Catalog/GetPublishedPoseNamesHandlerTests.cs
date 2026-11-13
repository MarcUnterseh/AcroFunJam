using AcroFunJam.Application.Catalog.GetPublishedPoseNames;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>The current names of published poses, read in one batch (story 7, ADR 0028).</summary>
public sealed class GetPublishedPoseNamesHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Pose APose(string name) => Pose.Publish(
        new PoseId(Guid.NewGuid()), PoseName.Create(name).Value!, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!, source: null, nameAlreadyPublished: false, Now).Value!;

    [Fact]
    public async Task Handle_Should_ReturnTheNamesOfThePublishedPosesOnly_When_SomeIdsAreUnknown()
    {
        var throne = APose("Throne");
        var bird = APose("Bird");
        var poses = new FakePoseRepository();
        poses.Add(throne);
        poses.Add(bird);
        var unknown = new PoseId(Guid.NewGuid());

        var result = await new GetPublishedPoseNamesHandler(poses).Handle(new GetPublishedPoseNames([throne.Id, unknown, bird.Id]), Ct);

        result.Value.ShouldNotBeNull().ShouldBe(
            new Dictionary<PoseId, PoseName> { [throne.Id] = throne.Name, [bird.Id] = bird.Name }, ignoreOrder: true);
    }
}

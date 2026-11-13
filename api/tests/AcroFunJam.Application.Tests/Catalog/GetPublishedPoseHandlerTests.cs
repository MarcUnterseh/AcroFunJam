using AcroFunJam.Application.Catalog.GetPublishedPose;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Reading a published pose with its version, to start a revision of it (story 6, ADR 0024).</summary>
public sealed class GetPublishedPoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Handle_Should_ReturnTheValuesAndTheVersionOfThePose_When_ItIsPublished()
    {
        var throne = Pose.Publish(
            new PoseId(Guid.NewGuid()), PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!, source: null, nameAlreadyPublished: false, Now).Value!;
        var poses = new FakePoseRepository();
        poses.Add(throne);

        var result = await new GetPublishedPoseHandler(poses).Handle(new GetPublishedPose(throne.Id), Ct);

        result.Value.ShouldBe(new PublishedPoseDetails(throne.Id, throne.Name, throne.Difficulty, throne.Flow, PoseVersion.Initial));
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNotFound_When_NoPublishedPoseHasTheId()
    {
        var result = await new GetPublishedPoseHandler(new FakePoseRepository()).Handle(new GetPublishedPose(new PoseId(Guid.NewGuid())), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNotFound);
    }
}

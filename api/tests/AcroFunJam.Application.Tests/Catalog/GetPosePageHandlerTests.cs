using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>The page of a published pose: the pose and its transitions from and to it (story 7, ADR 0030).</summary>
public sealed class GetPosePageHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Difficulty Beginner = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!;

    private static readonly Pose Star = Pose.Publish(
        new PoseId(Guid.NewGuid()), PoseName.Create("Star").Value!, Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Advanced).Value!,
        FlowBoundaries.Create(canStartFlow: false, canEndFlow: false).Value!, source: null, nameAlreadyPublished: false, Now).Value!;

    private static LinkedTransition Linked(string otherPose, string? name = null) =>
        new(new TransitionId(Guid.NewGuid()), new PoseId(Guid.NewGuid()), PoseName.Create(otherPose).Value!, TransitionName.CreateOptional(name).Value,
            Beginner, Description: null, TagSet.Empty);

    private readonly FakePoseRepository _poses = new();
    private readonly FakePoseTransitionsReader _transitions = new();

    public GetPosePageHandlerTests() => _poses.Add(Star);

    private GetPosePageHandler Handler() => new(_poses, _transitions, new FakeTagListRepository(), new FakePendingPoseRevisions());

    [Fact]
    public async Task Handle_Should_PresentThePoseWithItsVersion_When_ItIsPublished()
    {
        var page = (await Handler().Handle(new GetPosePage(Star.Id), Ct)).Value!;

        page.ShouldSatisfyAllConditions(
            p => p.Id.ShouldBe(Star.Id),
            p => p.Name.ShouldBe(Star.Name),
            p => p.Difficulty.ShouldBe(Star.Difficulty),
            p => p.Flow.ShouldBe(Star.Flow),
            p => p.Version.ShouldBe(PoseVersion.Initial),
            p => p.TransitionsFrom.ShouldBeEmpty(),
            p => p.TransitionsTo.ShouldBeEmpty());
    }

    /// <summary>C1 to C3: both lists, each in the order of the domain.</summary>
    [Fact]
    public async Task Handle_Should_OrderTheTransitionsFromAndToThePose_When_ItHasSome()
    {
        var toThrone = Linked("Throne");
        var ninjaStar = Linked("Star", "Ninja Star");
        var toBird = Linked("Bird");
        _transitions.From[Star.Id] = [toThrone, ninjaStar, toBird];
        var fromThrone = Linked("Throne");
        var fromBird = Linked("Bird");
        _transitions.To[Star.Id] = [fromThrone, fromBird];

        var page = (await Handler().Handle(new GetPosePage(Star.Id), Ct)).Value!;

        page.TransitionsFrom.ShouldBe([toBird, ninjaStar, toThrone]);
        page.TransitionsTo.ShouldBe([fromBird, fromThrone]);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNotFound_When_NoPublishedPoseHasTheId()
    {
        (await Handler().Handle(new GetPosePage(new PoseId(Guid.NewGuid())), Ct)).Error.ShouldBe(CatalogErrors.PoseNotFound);
    }
}

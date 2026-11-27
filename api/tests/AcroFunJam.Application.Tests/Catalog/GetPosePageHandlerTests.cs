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

    private readonly FakeTransitionVideosRepository _videos = new();

    private GetPosePageHandler Handler() => new(
        _poses, _transitions, new FakeTagListRepository(), new FakePendingPoseRevisions(), new FakePosePhotosRepository(), new FakePhotoAddresses(),
        _videos, new FakeVideoAddresses());

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

    /// <summary>Story 12, V11, V18: the videos of each transition, the ready ones for a visitor, all of them for a manager.</summary>
    [Fact]
    public async Task Handle_Should_PresentTheVideosOfEachTransitionToItsAudience_When_TheTransitionsHaveSome()
    {
        var toBird = Linked("Bird", "Pop to Bird");
        _transitions.From[Star.Id] = [toBird];
        var videos = TransitionVideos.For(toBird.Id);
        var rights = RightsConfirmation.ForVideo(true, new CatalogManagerId(Guid.NewGuid()), Now).Value!;
        var file = VideoFile.Accept(VideoFormat.Mp4, VideoFileSize.Create(1).Value!, new VideoDimensions(1920, 1080), VideoDuration.FromMilliseconds(12_000)).Value!;
        var ready = new VideoId(Guid.NewGuid());
        videos.Add(ready, file, VideoCaption.Create("Vue de face").Value!, VideoCredit.Create("Léa Martin").Value!, null, rights, Now);
        videos.Add(new VideoId(Guid.NewGuid()), file, VideoCaption.Create("Vue de côté").Value!, VideoCredit.Create("Léa Martin").Value!, null, rights, Now);
        videos.MarkPrepared(ready, new PreparedVideo(new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds(12_000)), Now);
        _videos.Stored[toBird.Id] = videos;

        var visitor = (await Handler().Handle(new GetPosePage(Star.Id), Ct)).Value!;
        var manager = (await Handler().Handle(new GetPosePage(Star.Id) { Audience = VideoAudience.Manager }, Ct)).Value!;

        visitor.VideosOf(toBird).Select(v => v.Caption).ShouldBe(["Vue de face"]);
        visitor.VideosOf(toBird)[0].Sources.ShouldBe(new FakeVideoAddresses().Of(ready));
        manager.VideosOf(toBird).Select(v => (v.Caption, v.Preparation))
            .ShouldBe([("Vue de face", VideoPreparation.Ready), ("Vue de côté", VideoPreparation.InPreparation)]);
        visitor.VideosOf(Linked("Throne")).ShouldBeEmpty();
    }
}

using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.CorrectTransitionVideo;
using AcroFunJam.Application.Catalog.GetTransitionVideos;
using AcroFunJam.Application.Catalog.GetVideoContent;
using AcroFunJam.Application.Catalog.PrepareNextVideo;
using AcroFunJam.Application.Catalog.RemoveTransitionVideo;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>
/// Managing, preparing and serving the videos of a transition (story 12, V11, V15 to V17, V23, ADR 0041): removal (the files
/// deleted after the save), correction, the list for the managers, the preparation by the worker, and the files served once ready.
/// </summary>
public sealed class TransitionVideosHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly CatalogManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static readonly TransitionId PopToBird = new(Guid.Parse("70000000-0000-0000-0000-000000000001"));
    private static readonly Difficulty Intermediate = Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Intermediate).Value!;
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeTransitionRepository _transitions = new();
    private readonly FakeTransitionVideosRepository _videos = new();
    private readonly FakeTransitionVideosLock _lock = new();
    private readonly FakeVideoProcessor _processor = new();
    private readonly FakeVideoStorage _storage = new();
    private readonly FakeVideoPreparationQueue _queue = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FixedTimeProvider _clock = new(Now);

    public TransitionVideosHandlersTests() =>
        _transitions.Add(Transition.Publish(
            PopToBird, new PoseId(Guid.NewGuid()), new PoseId(Guid.NewGuid()), TransitionName.CreateOptional("Pop to Bird").Value, Intermediate,
            description: null, new TagChoice(TagSet.Empty, TagSet.Empty), source: null, fromPosePublished: true, toPosePublished: true,
            slotTaken: false, Now).Value!);

    private VideoId Added(string caption, double seconds = 12)
    {
        var id = new VideoId(Guid.CreateVersion7());
        var videos = _videos.Stored.GetValueOrDefault(PopToBird) ?? TransitionVideos.For(PopToBird);
        videos.Add(id, VideoFile.Accept(VideoFormat.Mp4, VideoFileSize.Create(1).Value!, new VideoDimensions(3840, 2160),
                VideoDuration.FromMilliseconds((long)(seconds * 1000))).Value!,
            VideoCaption.Create(caption).Value!, VideoCredit.Create("Léa Martin").Value!, null, RightsConfirmation.ForVideo(true, Bruno, Now).Value!, Now);
        videos.ClearDomainEvents();
        _videos.Stored[PopToBird] = videos;
        _storage.Originals[id] = "original";
        _queue.Enqueue(id, PopToBird, Now);
        return id;
    }

    private Video VideoOf(VideoId id) => _videos.Stored[PopToBird].InAdditionOrder().Single(v => v.Id == id);

    private PrepareNextVideoHandler Preparing() => new(_queue, _videos, _lock, _processor, _storage, _unitOfWork, _clock);

    // --- Removing (V16) -------------------------------------------------------------------------

    [Fact]
    public async Task RemoveTransitionVideo_Should_SaveTheRemovalThenDeleteTheFiles_When_TheVideoExists()
    {
        var face = Added("Vue de face");

        (await new RemoveTransitionVideoHandler(_videos, _lock, _storage, _unitOfWork, _clock).Handle(new RemoveTransitionVideo(PopToBird, face), Ct))
            .Value.ShouldBe(face);

        _videos.Stored[PopToBird].InAdditionOrder().ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(1);
        _storage.Deleted.ShouldBe([face]);
        _lock.Locked.ShouldBe([PopToBird]);
    }

    [Fact]
    public async Task RemoveTransitionVideo_Should_FailWithVideoNotFound_When_TheVideoIsAlreadyRemoved()
    {
        (await new RemoveTransitionVideoHandler(_videos, _lock, _storage, _unitOfWork, _clock)
                .Handle(new RemoveTransitionVideo(PopToBird, new VideoId(Guid.NewGuid())), Ct))
            .Error.ShouldBe(CatalogErrors.VideoNotFound);
        _storage.Deleted.ShouldBeEmpty();
    }

    // --- Correcting (V17, V23) ------------------------------------------------------------------

    [Fact]
    public async Task CorrectTransitionVideo_Should_ChangeTheTexts_When_TheyAreValid()
    {
        var face = Added("Vue de face");

        var corrected = (await new CorrectTransitionVideoHandler(_videos, _lock, new FakeVideoAddresses(), _unitOfWork, _clock)
            .Handle(new CorrectTransitionVideo(PopToBird, face, "  Pop to Bird, démonstration de face ", "Léa Martin", "Au ralenti."), Ct)).Value!;

        corrected.Caption.ShouldBe("Pop to Bird, démonstration de face");
        corrected.Description.ShouldBe("Au ralenti.");
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Theory]
    [InlineData("   ", "Léa Martin", null, "video.caption-required")]
    [InlineData("Vue", "Auteur inconnu", null, "video.credit-not-an-author")]
    [InlineData("Vue", "Léa Martin", "301", "video.description-too-long")]
    public async Task CorrectTransitionVideo_Should_RefuseWithTheRulesOfAnAddition_When_ATextIsInvalid(
        string caption, string credit, string? description, string code)
    {
        var face = Added("Vue de face");

        var refused = await new CorrectTransitionVideoHandler(_videos, _lock, new FakeVideoAddresses(), _unitOfWork, _clock)
            .Handle(new CorrectTransitionVideo(PopToBird, face, caption, credit, description == "301" ? new string('d', 301) : description), Ct);

        refused.Error!.Code.ShouldBe(code);
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Listing for the managers (UX-52) ----------------------------------------------------

    [Fact]
    public async Task GetTransitionVideos_Should_GiveEveryVideoWithItsPreparation_When_TheTransitionIsPublished()
    {
        var face = Added("Vue de face");
        Added("Vue de côté");
        _videos.Stored[PopToBird].MarkPrepared(face, new PreparedVideo(new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds(12_000)), Now);

        var videos = (await new GetTransitionVideosHandler(_transitions, _videos, new FakeVideoAddresses()).Handle(new GetTransitionVideos(PopToBird), Ct)).Value!;

        videos.Select(v => (v.Caption, v.Preparation)).ShouldBe([("Vue de face", VideoPreparation.Ready), ("Vue de côté", VideoPreparation.InPreparation)]);
        videos[0].Sources.ShouldBe(new VideoSources($"/catalog/videos/{face.Value}/video", $"/catalog/videos/{face.Value}/poster"));
        videos[1].Sources.ShouldBeNull();
    }

    [Fact]
    public async Task GetTransitionVideos_Should_FailWithTransitionNotFound_When_TheTransitionIsUnknown()
    {
        (await new GetTransitionVideosHandler(_transitions, _videos, new FakeVideoAddresses())
                .Handle(new GetTransitionVideos(new TransitionId(Guid.NewGuid())), Ct))
            .Error.ShouldBe(CatalogErrors.TransitionNotFound);
    }

    // --- Serving (V16, Q307) ------------------------------------------------------------------

    [Fact]
    public async Task GetVideoContent_Should_GiveTheAskedRange_When_TheVideoIsReady()
    {
        var face = Added("Vue de face");
        _videos.Stored[PopToBird].MarkPrepared(face, new PreparedVideo(new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds(12_000)), Now);
        _storage.Contents[(face, VideoRendition.Video)] = [1, 2, 3, 4, 5];

        var content = (await new GetVideoContentHandler(_videos, _storage).Handle(new GetVideoContent(face, VideoRendition.Video, new ByteRange(1, 2)), Ct)).Value!;

        content.TotalLength.ShouldBe(5);
        content.Range.ShouldBe((1L, 2L));
    }

    [Fact]
    public async Task GetVideoContent_Should_FailWithVideoNotFound_When_TheVideoIsStillInPreparation()
    {
        var face = Added("Vue de face");
        _storage.Contents[(face, VideoRendition.Poster)] = [1];

        (await new GetVideoContentHandler(_videos, _storage).Handle(new GetVideoContent(face, VideoRendition.Poster, null), Ct))
            .Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    [Fact]
    public async Task GetVideoContent_Should_FailWithVideoNotFound_When_TheFileIsNotStored()
    {
        var face = Added("Vue de face");
        _videos.Stored[PopToBird].MarkPrepared(face, new PreparedVideo(new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds(12_000)), Now);

        (await new GetVideoContentHandler(_videos, _storage).Handle(new GetVideoContent(face, VideoRendition.Video, null), Ct))
            .Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    // --- Preparing (V8 to V11, ADR 0041) ------------------------------------------------------------

    [Fact]
    public async Task PrepareNextVideo_Should_DoNothing_When_NoVideoWaits()
    {
        (await Preparing().Handle(new PrepareNextVideo(), Ct)).Value.ShouldBeFalse();
        _processor.Prepared.ShouldBeEmpty();
    }

    [Fact]
    public async Task PrepareNextVideo_Should_PrepareTheVideoInItsPresentedDimensionsAndMakeItReady_When_ItWaits()
    {
        var face = Added("Vue de face");

        (await Preparing().Handle(new PrepareNextVideo(), Ct)).Value.ShouldBeTrue();

        _processor.Prepared.ShouldBe([($"fetched-{face.Value}", new VideoDimensions(1280, 720))]);
        _storage.Prepared.Keys.ShouldBe([face]);
        VideoOf(face).Preparation.ShouldBe(VideoPreparation.Ready);
        _queue.Jobs.ShouldBeEmpty();
        _storage.DeletedOriginals.ShouldBe([face]);
        _processor.CleanedUp.ShouldBe(1);
        _storage.FetchesCleanedUp.ShouldBe(1);
        _lock.Locked.ShouldBe([PopToBird]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_MakeTheVideoImpossibleToPrepare_When_TheFileIsDamaged()
    {
        var face = Added("Vue de face");
        _processor.Damaged = true;

        (await Preparing().Handle(new PrepareNextVideo(), Ct)).Value.ShouldBeTrue();

        VideoOf(face).Preparation.ShouldBe(VideoPreparation.Failed);
        _storage.Prepared.ShouldBeEmpty();
        _queue.Jobs.ShouldBeEmpty();
        _storage.DeletedOriginals.ShouldBe([face]);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_MakeTheVideoImpossibleToPrepare_When_ItsDecodedDurationLiedAtTheDemultiplexing()
    {
        var face = Added("Vue de face", seconds: 10);
        _processor.DecodedDuration = VideoDuration.FromMilliseconds(40_000);

        await Preparing().Handle(new PrepareNextVideo(), Ct);

        VideoOf(face).Preparation.ShouldBe(VideoPreparation.Failed);
        _queue.Jobs.ShouldBeEmpty();
        _storage.Deleted.ShouldBe([face]);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_GiveTheJobBackWithoutCountingTheAttempt_When_TheWorkerStopsDuringThePreparation()
    {
        var face = Added("Vue de face");
        using var stopping = new CancellationTokenSource();
        _processor.DuringPreparation = stopping.Cancel;

        await Should.ThrowAsync<OperationCanceledException>(() => Preparing().Handle(new PrepareNextVideo(), stopping.Token));

        VideoOf(face).Preparation.ShouldBe(VideoPreparation.InPreparation);
        _queue.Released.ShouldBe([face]);
        _queue.Jobs.Single().Attempts.ShouldBe(0);
        _storage.Originals.ShouldContainKey(face);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_KeepTheJobAndTheOriginal_When_ThePreparationCrashes()
    {
        var face = Added("Vue de face");
        _processor.Crashes = true;

        await Should.ThrowAsync<InvalidOperationException>(() => Preparing().Handle(new PrepareNextVideo(), Ct));

        VideoOf(face).Preparation.ShouldBe(VideoPreparation.InPreparation);
        _queue.Jobs.Single().Attempts.ShouldBe(1);
        _storage.Originals.ShouldContainKey(face);
        _storage.FetchesCleanedUp.ShouldBe(1);
        _queue.Released.ShouldBeEmpty();
    }

    [Fact]
    public async Task PrepareNextVideo_Should_GiveUpWithoutPreparing_When_TheVideoWasClaimedTwiceAlready()
    {
        var face = Added("Vue de face");
        _processor.Crashes = true;
        await Should.ThrowAsync<InvalidOperationException>(() => Preparing().Handle(new PrepareNextVideo(), Ct));
        await Should.ThrowAsync<InvalidOperationException>(() => Preparing().Handle(new PrepareNextVideo(), Ct));
        _processor.Prepared.Clear();

        (await Preparing().Handle(new PrepareNextVideo(), Ct)).Value.ShouldBeTrue();

        _processor.Prepared.ShouldBeEmpty();
        VideoOf(face).Preparation.ShouldBe(VideoPreparation.Failed);
        _queue.Jobs.ShouldBeEmpty();
        _storage.DeletedOriginals.ShouldBe([face]);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_DeleteWhatItProduced_When_TheVideoWasRemovedDuringThePreparation()
    {
        var face = Added("Vue de face");
        _lock.OnLock = () => _videos.Stored[PopToBird].Remove(face, Now);

        (await Preparing().Handle(new PrepareNextVideo(), Ct)).Value.ShouldBeTrue();

        _storage.Deleted.ShouldBe([face]);
        _storage.Prepared.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task PrepareNextVideo_Should_MakeTheVideoImpossibleToPrepare_When_ItsOriginalIsLost()
    {
        var face = Added("Vue de face");
        _storage.Originals.Clear();

        await Preparing().Handle(new PrepareNextVideo(), Ct);

        _processor.Prepared.ShouldBeEmpty();
        VideoOf(face).Preparation.ShouldBe(VideoPreparation.Failed);
        _queue.Jobs.ShouldBeEmpty();
    }

    // --- Ranges (Q307) ----------------------------------------------------------------------------

    [Theory]
    [InlineData(0L, 1L, 0L, 1L)]
    [InlineData(5L, null, 5L, 9L)]
    [InlineData(null, 3L, 7L, 9L)]
    [InlineData(8L, 20L, 8L, 9L)]
    [InlineData(null, 20L, 0L, 9L)]
    public void ByteRangeWithin_Should_GiveTheFirstAndLastBytes_When_TheRangeIsInsideTheFile(long? from, long? to, long first, long last)
    {
        new ByteRange(from, to).Within(10).ShouldBe((first, last));
    }

    [Theory]
    [InlineData(10L, null)]
    [InlineData(10L, 12L)]
    [InlineData(5L, 4L)]
    [InlineData(null, 0L)]
    public void ByteRangeWithin_Should_GiveNothing_When_TheRangeIsOutsideTheFile(long? from, long? to)
    {
        new ByteRange(from, to).Within(10).ShouldBeNull();
    }
}

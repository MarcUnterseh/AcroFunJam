using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTransitionVideo;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>
/// Adding a video to a published transition (story 12, V1 to V7, V12 to V15, V23, ADR 0041): the texts, the weight, the
/// transition and the maximum are checked before the file is probed; the original is stored outside the lock, then the aggregate
/// decides under the lock and the preparation is queued in the same transaction.
/// </summary>
public sealed class AddTransitionVideoHandlerTests
{
    private static readonly DateTimeOffset On1December = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly CatalogManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static readonly Difficulty Intermediate = Difficulty.Create(DifficultyLevel.Intermediate, DifficultyLevel.Intermediate).Value!;
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeTransitionRepository _transitions = new();
    private readonly FakeTransitionVideosRepository _videos = new();
    private readonly FakeTransitionVideosLock _lock = new();
    private readonly FakeVideoProcessor _processor = new();
    private readonly FakeVideoStorage _storage = new();
    private readonly FakeVideoPreparationQueue _queue = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly Transition _popToBird;

    public AddTransitionVideoHandlerTests()
    {
        _popToBird = Transition.Publish(
            new TransitionId(Guid.NewGuid()), new PoseId(Guid.NewGuid()), new PoseId(Guid.NewGuid()), TransitionName.CreateOptional("Pop to Bird").Value,
            Intermediate, description: null, new TagChoice(TagSet.Empty, TagSet.Empty), source: null, fromPosePublished: true, toPosePublished: true, slotTaken: false, On1December).Value!;
        _transitions.Add(_popToBird);
    }

    private AddTransitionVideoHandler Handler(FakeUnitOfWork? unitOfWork = null) =>
        new(_transitions, _videos, _lock, _processor, _storage, _queue, new FakeVideoAddresses(), unitOfWork ?? _unitOfWork,
            new FixedTimeProvider(On1December));

    private AddTransitionVideo Adding(
        string? caption = "Pop to Bird, vue de côté", string? credit = "Léa Martin", string? description = null, bool rights = true,
        long bytes = 20 * 1024 * 1024, TransitionId? transition = null) =>
        new(transition ?? _popToBird.Id, bytes > 0 ? new VideoUpload("upload.mp4", bytes) : null, caption, credit, description, rights, Bruno);

    [Fact]
    public async Task Handle_Should_AddTheVideoInPreparationStoreItsOriginalAndQueueItsPreparation_When_EverythingIsValid()
    {
        PresentedVideo added = (await Handler().Handle(Adding(description: "La base pousse."), Ct)).Value!;

        added.Caption.ShouldBe("Pop to Bird, vue de côté");
        added.Credit.ShouldBe("Léa Martin");
        added.Description.ShouldBe("La base pousse.");
        added.Width.ShouldBe(1280);
        added.Height.ShouldBe(720);
        added.DurationMs.ShouldBe(12_000);
        added.Preparation.ShouldBe(VideoPreparation.InPreparation);
        added.Sources.ShouldBeNull();
        _processor.Probed.ShouldBe(["upload.mp4"]);
        _storage.Originals.ShouldBe(new Dictionary<VideoId, string> { [added.Id] = "upload.mp4" });
        _queue.Jobs.ShouldBe([new VideoPreparationJob(added.Id, _popToBird.Id, 0)]);
        _videos.Single(_popToBird.Id).Rights.ShouldBe(new RightsConfirmation(Bruno, On1December));
        _lock.Locked.ShouldBe([_popToBird.Id]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_NotChangeTheTransition_When_AVideoIsAdded()
    {
        await Handler().Handle(Adding(), Ct);

        _transitions.Updated.ShouldBeEmpty();
    }

    public static TheoryData<string?, string?, string?, bool, string> InvalidTexts() => new()
    {
        { null, "Léa Martin", null, true, "video.caption-required" },
        { new string('a', 101), "Léa Martin", null, true, "video.caption-too-long" },
        { "Vue", null, null, true, "video.credit-required" },
        { "Vue", "inconnu", null, true, "video.credit-not-an-author" },
        { "Vue", "Léa Martin", new string('d', 301), true, "video.description-too-long" },
        { "Vue", "Léa Martin", null, false, "video.rights-confirmation-required" },
    };

    [Theory]
    [MemberData(nameof(InvalidTexts))]
    public async Task Handle_Should_RefuseBeforeProbingTheFile_When_ATextOrTheConfirmationIsInvalid(
        string? caption, string? credit, string? description, bool rights, string code)
    {
        var refused = await Handler().Handle(Adding(caption, credit, description, rights), Ct);

        refused.Error!.Code.ShouldBe(code);
        _processor.Probed.ShouldBeEmpty();
        _storage.Originals.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithFileRequired_When_ThereIsNoFile()
    {
        (await Handler().Handle(Adding(bytes: 0), Ct)).Error.ShouldBe(VideoContentErrors.FileRequired);
    }

    [Fact]
    public async Task Handle_Should_FailWithTooLarge_When_TheFileWeighsMoreThan100Megabytes()
    {
        (await Handler().Handle(Adding(bytes: VideoFileSize.MaxBytes + 1), Ct)).Error.ShouldBe(VideoContentErrors.TooLarge);
        _processor.Probed.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithTransitionNotFound_When_TheTransitionIsNotPublished()
    {
        (await Handler().Handle(Adding(transition: new TransitionId(Guid.NewGuid())), Ct)).Error.ShouldBe(CatalogErrors.TransitionNotFound);
        _processor.Probed.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailFastWithVideoLimitReached_When_TheTransitionHasAlready3Videos()
    {
        for (var n = 0; n < 3; n++) await Handler().Handle(Adding(), Ct);
        _processor.Probed.Clear();

        (await Handler().Handle(Adding(), Ct)).Error.ShouldBe(CatalogErrors.VideoLimitReached);
        _processor.Probed.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_RefuseWithTheDecisionOfTheDomain_When_TheProbedFileIsNotAcceptable()
    {
        _processor.Probe = new VideoProbe(VideoFormat.Mp4, new VideoDimensions(1920, 1080), VideoDuration.FromMilliseconds(31_700));

        var refused = await Handler().Handle(Adding(), Ct);

        refused.Error.ShouldBe(VideoContentErrors.TooLong(31));
        _storage.Originals.ShouldBeEmpty();
        _queue.Jobs.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_DeleteTheStoredOriginal_When_TheMaximumIsReachedMeanwhile()
    {
        _lock.OnLock = () =>
        {
            _lock.OnLock = null;
            var videos = TransitionVideos.For(_popToBird.Id);
            for (var n = 0; n < 3; n++)
            {
                videos.Add(new VideoId(Guid.NewGuid()), VideoFile.Accept(VideoFormat.Mp4, VideoFileSize.Create(1).Value!,
                    new VideoDimensions(1920, 1080), VideoDuration.FromMilliseconds(12_000)).Value!, VideoCaption.Create($"Vue {n}").Value!,
                    VideoCredit.Create("Léa Martin").Value!, null, RightsConfirmation.ForVideo(true, Bruno, On1December).Value!, On1December);
            }

            _videos.Stored[_popToBird.Id] = videos;
        };

        var refused = await Handler().Handle(Adding(), Ct);

        refused.Error.ShouldBe(CatalogErrors.VideoLimitReached);
        _storage.Originals.ShouldBeEmpty();
        _storage.DeletedOriginals.Count.ShouldBe(1);
        _queue.Jobs.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_DeleteTheStoredOriginal_When_TheSaveFails()
    {
        var refusal = new Error("catalog.conflict", "Conflit.");

        var refused = await Handler(new FakeUnitOfWork(refusal)).Handle(Adding(), Ct);

        refused.Error.ShouldBe(refusal);
        _storage.Originals.ShouldBeEmpty();
        _storage.DeletedOriginals.Count.ShouldBe(1);
    }
}

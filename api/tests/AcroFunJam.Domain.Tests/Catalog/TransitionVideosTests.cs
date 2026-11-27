using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>
/// The videos of a transition (story 12, V1, V11, V15 to V17, V23): 3 at most, in preparation included, presented in the order
/// of addition; prepared in deferred time (in preparation, ready or impossible to prepare); visitors see the ready ones only.
/// </summary>
public sealed class TransitionVideosTests
{
    private static readonly TransitionId PopToBird = new(Guid.Parse("70000000-0000-0000-0000-000000000001"));
    private static readonly CatalogManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static readonly DateTimeOffset Now = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private static readonly VideoFile Uhd = VideoFile.Accept(
        VideoFormat.Mp4, VideoFileSize.Create(20 * 1024 * 1024).Value!, new VideoDimensions(3840, 2160), VideoDuration.FromMilliseconds(12_000)).Value!;

    private static VideoId Id(int n) => new(Guid.Parse($"e0000000-0000-0000-0000-00000000000{n}"));

    private static VideoCaption Caption(string text) => VideoCaption.Create(text).Value!;

    private static VideoCredit Credit(string text) => VideoCredit.Create(text).Value!;

    private static VideoDescription? Description(string? text) => VideoDescription.Create(text).Value;

    private static RightsConfirmation Rights() => RightsConfirmation.ForVideo(true, Bruno, Now).Value!;

    private static PreparedVideo Prepared(double seconds = 12) =>
        new(new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds((long)(seconds * 1000)));

    private static TransitionVideos WithVideos(int count)
    {
        var videos = TransitionVideos.For(PopToBird);
        for (var n = 1; n <= count; n++)
            videos.Add(Id(n), Uhd, Caption($"Vue {n}"), Credit("Léa Martin"), null, Rights(), Now).IsSuccess.ShouldBeTrue();
        videos.ClearDomainEvents();
        return videos;
    }

    private static string[] Captions(IEnumerable<Video> videos) => [.. videos.Select(v => v.Caption.Value)];

    [Fact]
    public void For_Should_HaveNoVideo_When_TheTransitionHasNoVideoYet()
    {
        var videos = TransitionVideos.For(PopToBird);

        videos.Id.ShouldBe(PopToBird);
        videos.InAdditionOrder().ShouldBeEmpty();
        videos.IsFull.ShouldBeFalse();
    }

    [Fact]
    public void Add_Should_AddAVideoInPreparationWithItsPlannedDimensions_When_TheTransitionHasRoom()
    {
        var videos = TransitionVideos.For(PopToBird);

        var added = videos.Add(Id(1), Uhd, Caption("Pop to Bird, vue de côté"), Credit("Léa Martin"),
            Description("La base pousse les pieds du flyer."), Rights(), Now).Value!;

        added.Id.ShouldBe(Id(1));
        added.Caption.Value.ShouldBe("Pop to Bird, vue de côté");
        added.Credit.Value.ShouldBe("Léa Martin");
        added.Description!.Value.ShouldBe("La base pousse les pieds du flyer.");
        added.Dimensions.ShouldBe(new VideoDimensions(1280, 720));
        added.Duration.ShouldBe(VideoDuration.FromMilliseconds(12_000));
        added.Preparation.ShouldBe(VideoPreparation.InPreparation);
        added.Rights.ShouldBe(Rights());
        added.AddedAt.ShouldBe(Now);
        videos.DomainEvents.ShouldBe([new VideoAdded(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void Add_Should_KeepTheOrderOfAddition_When_SeveralVideosAreAdded()
    {
        var videos = WithVideos(3);

        Captions(videos.InAdditionOrder()).ShouldBe(["Vue 1", "Vue 2", "Vue 3"]);
        videos.InAdditionOrder().Select(v => v.AdditionRank).ShouldBe([1, 2, 3]);
    }

    [Fact]
    public void Add_Should_FailWithVideoLimitReached_When_TheTransitionHasAlready3Videos()
    {
        var videos = WithVideos(3);

        videos.IsFull.ShouldBeTrue();
        videos.Add(Id(4), Uhd, Caption("Vue 4"), Credit("Léa Martin"), null, Rights(), Now).Error.ShouldBe(CatalogErrors.VideoLimitReached);
        videos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Add_Should_GiveTheNextRank_When_AVideoWasRemovedBefore()
    {
        var videos = WithVideos(3);
        videos.Remove(Id(1), Now);

        var added = videos.Add(Id(4), Uhd, Caption("Pop to Bird au ralenti"), Credit("Léa Martin"), null, Rights(), Now).Value!;

        added.AdditionRank.ShouldBe(4);
        Captions(videos.InAdditionOrder()).ShouldBe(["Vue 2", "Vue 3", "Pop to Bird au ralenti"]);
    }

    [Fact]
    public void PresentedTo_Should_GiveTheReadyVideosOnly_When_TheAudienceIsAVisitor()
    {
        var videos = WithVideos(3);
        videos.MarkPrepared(Id(2), Prepared(), Now);
        videos.MarkPreparationFailed(Id(3), Now);

        Captions(videos.PresentedTo(VideoAudience.Visitor)).ShouldBe(["Vue 2"]);
        Captions(videos.PresentedTo(VideoAudience.Manager)).ShouldBe(["Vue 1", "Vue 2", "Vue 3"]);
    }

    [Fact]
    public void MarkPrepared_Should_MakeTheVideoReadyWithItsPreparedDimensions_When_ItWasInPreparation()
    {
        var videos = WithVideos(1);

        var prepared = videos.MarkPrepared(Id(1), new PreparedVideo(new VideoDimensions(1278, 720), VideoDuration.FromMilliseconds(12_040)), Now).Value!;

        prepared.Preparation.ShouldBe(VideoPreparation.Ready);
        prepared.Dimensions.ShouldBe(new VideoDimensions(1278, 720));
        prepared.Duration.ShouldBe(VideoDuration.FromMilliseconds(12_040));
        videos.DomainEvents.ShouldBe([new VideoPrepared(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void MarkPrepared_Should_MakeTheVideoImpossibleToPrepare_When_ItsDecodedDurationExceedsTheLimitByMoreThanHalfASecond()
    {
        var videos = WithVideos(1);

        var prepared = videos.MarkPrepared(Id(1), Prepared(seconds: 40), Now).Value!;

        prepared.Preparation.ShouldBe(VideoPreparation.Failed);
        videos.DomainEvents.ShouldBe([new VideoPreparationFailed(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void MarkPrepared_Should_FailWithVideoNotFound_When_TheVideoWasRemovedMeanwhile()
    {
        var videos = WithVideos(1);
        videos.Remove(Id(1), Now);

        videos.MarkPrepared(Id(1), Prepared(), Now).Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    [Fact]
    public void MarkPrepared_Should_ChangeNothing_When_TheVideoIsNoLongerInPreparation()
    {
        var videos = WithVideos(1);
        videos.MarkPreparationFailed(Id(1), Now);
        videos.ClearDomainEvents();

        videos.MarkPrepared(Id(1), Prepared(), Now).Value!.Preparation.ShouldBe(VideoPreparation.Failed);
        videos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void MarkPreparationFailed_Should_MakeTheVideoImpossibleToPrepare_When_ItWasInPreparation()
    {
        var videos = WithVideos(1);

        videos.MarkPreparationFailed(Id(1), Now).Value!.Preparation.ShouldBe(VideoPreparation.Failed);
        videos.DomainEvents.ShouldBe([new VideoPreparationFailed(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void MarkPreparationFailed_Should_FailWithVideoNotFound_When_TheVideoIsUnknown()
    {
        WithVideos(1).MarkPreparationFailed(Id(9), Now).Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    [Fact]
    public void Remove_Should_RemoveTheVideo_When_ItIsStillInPreparation()
    {
        var videos = WithVideos(2);

        videos.Remove(Id(1), Now).Value!.Id.ShouldBe(Id(1));

        Captions(videos.InAdditionOrder()).ShouldBe(["Vue 2"]);
        videos.DomainEvents.ShouldBe([new VideoRemoved(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void Remove_Should_FailWithVideoNotFound_When_TheVideoIsAlreadyRemoved()
    {
        var videos = WithVideos(1);
        videos.Remove(Id(1), Now);

        videos.Remove(Id(1), Now).Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    [Fact]
    public void Correct_Should_ChangeTheTextsAndKeepThePlace_When_TheVideoExists()
    {
        var videos = WithVideos(2);

        var corrected = videos.Correct(Id(1), Caption("Pop to Bird, démonstration de face"), Credit("Léa Martin"),
            Description("Vue de face, au ralenti."), Now).Value!;

        corrected.Caption.Value.ShouldBe("Pop to Bird, démonstration de face");
        corrected.Description!.Value.ShouldBe("Vue de face, au ralenti.");
        Captions(videos.InAdditionOrder()).ShouldBe(["Pop to Bird, démonstration de face", "Vue 2"]);
        videos.DomainEvents.ShouldBe([new VideoCorrected(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void Correct_Should_RemoveTheDescription_When_NoneIsGiven()
    {
        var videos = TransitionVideos.For(PopToBird);
        videos.Add(Id(1), Uhd, Caption("Vue de face"), Credit("Léa Martin"), Description("Au ralenti."), Rights(), Now);
        videos.ClearDomainEvents();

        videos.Correct(Id(1), Caption("Vue de face"), Credit("Léa Martin"), null, Now).Value!.Description.ShouldBeNull();
        videos.DomainEvents.ShouldBe([new VideoCorrected(PopToBird, Id(1), Now)]);
    }

    [Fact]
    public void Correct_Should_RaiseNothing_When_NothingChanges()
    {
        var videos = WithVideos(1);

        videos.Correct(Id(1), Caption("Vue 1"), Credit("Léa Martin"), null, Now).IsSuccess.ShouldBeTrue();
        videos.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void Correct_Should_FailWithVideoNotFound_When_TheVideoIsUnknown()
    {
        WithVideos(1).Correct(Id(9), Caption("Vue"), Credit("Léa Martin"), null, Now).Error.ShouldBe(CatalogErrors.VideoNotFound);
    }

    [Fact]
    public void ForVideo_Should_KeepWhoConfirmedAndWhen_When_TheBoxIsTicked()
    {
        var confirmation = RightsConfirmation.ForVideo(true, Bruno, Now).Value!;

        confirmation.ConfirmedBy.ShouldBe(Bruno);
        confirmation.ConfirmedAt.ShouldBe(Now);
    }

    [Fact]
    public void ForVideo_Should_FailWithTheRightsConfirmationOfAVideo_When_TheBoxIsNotTicked()
    {
        RightsConfirmation.ForVideo(false, Bruno, Now).Error.ShouldBe(VideoContentErrors.RightsConfirmationRequired);
    }
}

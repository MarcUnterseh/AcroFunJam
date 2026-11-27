using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>
/// The file of a video as found by the processing (story 12, V4 to V7, V9): MP4, MOV or WebM; 100 MiB at most; from 2 s to less
/// than 31 s; at least 480 px on the shorter side; presented in 720 px at most on the shorter side, never enlarged. The
/// processing only finds; the domain decides (VideoFile.Accept).
/// </summary>
public sealed class VideoFileTests
{
    private static readonly VideoFileSize TwentyMegabytes = VideoFileSize.Create(20 * 1024 * 1024).Value!;
    private static readonly VideoDimensions FullHd = new(1920, 1080);

    private static VideoDuration Seconds(double seconds) => VideoDuration.FromMilliseconds((long)(seconds * 1000));

    [Theory]
    [InlineData(VideoFormat.Mp4)]
    [InlineData(VideoFormat.QuickTime)]
    [InlineData(VideoFormat.WebM)]
    public void Accept_Should_AcceptTheFile_When_ItIsAnAcceptedFormatOfTheRightDurationAndSize(VideoFormat format)
    {
        var file = VideoFile.Accept(format, TwentyMegabytes, FullHd, Seconds(12)).Value!;

        file.Format.ShouldBe(format);
        file.Size.ShouldBe(TwentyMegabytes);
        file.Dimensions.ShouldBe(FullHd);
        file.Duration.ShouldBe(Seconds(12));
    }

    [Fact]
    public void Accept_Should_FailWithFormatNotAccepted_When_TheFormatIsNotRecognised()
    {
        VideoFile.Accept(null, TwentyMegabytes, FullHd, Seconds(12)).Error.ShouldBe(VideoContentErrors.FormatNotAccepted);
    }

    [Fact]
    public void Accept_Should_FailWithUnreadable_When_TheDimensionsOrTheDurationCouldNotBeFound()
    {
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, null, Seconds(12)).Error.ShouldBe(VideoContentErrors.Unreadable);
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, FullHd, null).Error.ShouldBe(VideoContentErrors.Unreadable);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(30)]
    [InlineData(30.9)]
    [InlineData(30.999)]
    public void Accept_Should_AcceptTheVideo_When_ItLastsFrom2SecondsToLessThan31(double seconds)
    {
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, FullHd, Seconds(seconds)).IsSuccess.ShouldBeTrue();
    }

    [Theory]
    [InlineData(31, 31)]
    [InlineData(31.7, 31)]
    [InlineData(45.2, 45)]
    public void Accept_Should_FailWithTooLongAndTheTruncatedSeconds_When_TheVideoLasts31SecondsOrMore(double seconds, int said)
    {
        var error = VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, FullHd, Seconds(seconds)).Error;

        error.ShouldBe(VideoContentErrors.TooLong(said));
        error!.Code.ShouldBe("video.too-long");
        error.Message.ShouldBe($"Cette vidéo dure {said} secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau.");
        error.ShouldBeOfType<VideoTooLongError>().DurationSeconds.ShouldBe(said);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(1.999)]
    public void Accept_Should_FailWithTooShort_When_TheVideoLastsLessThan2Seconds(double seconds)
    {
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, FullHd, Seconds(seconds)).Error.ShouldBe(VideoContentErrors.TooShort);
    }

    [Theory]
    [InlineData(854, 480)]
    [InlineData(480, 854)]
    [InlineData(3840, 2160)]
    public void Accept_Should_AcceptTheVideo_When_ItsShorterSideHasAtLeast480Pixels(int width, int height)
    {
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, new VideoDimensions(width, height), Seconds(12)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Accept_Should_FailWithTooSmall_When_ItsShorterSideHasLessThan480Pixels()
    {
        VideoFile.Accept(VideoFormat.Mp4, TwentyMegabytes, new VideoDimensions(640, 360), Seconds(12)).Error.ShouldBe(VideoContentErrors.TooSmall);
    }

    [Fact]
    public void SizeCreate_Should_AcceptTheFile_When_ItWeighs100MegabytesAtMost()
    {
        VideoFileSize.MaxBytes.ShouldBe(100L * 1024 * 1024);
        VideoFileSize.Create(VideoFileSize.MaxBytes).Value!.Bytes.ShouldBe(VideoFileSize.MaxBytes);
    }

    [Fact]
    public void SizeCreate_Should_FailWithTooLarge_When_TheFileWeighsMoreThan100Megabytes()
    {
        VideoFileSize.Create(VideoFileSize.MaxBytes + 1).Error.ShouldBe(VideoContentErrors.TooLarge);
    }

    [Fact]
    public void SizeCreate_Should_FailWithFileRequired_When_TheFileIsEmpty()
    {
        VideoFileSize.Create(0).Error.ShouldBe(VideoContentErrors.FileRequired);
    }

    [Theory]
    [InlineData(3840, 2160, 1280, 720)]
    [InlineData(1080, 1920, 720, 1280)]
    [InlineData(854, 480, 854, 480)]
    [InlineData(720, 1280, 720, 1280)]
    [InlineData(1920, 1080, 1280, 720)]
    [InlineData(1000, 750, 960, 720)]
    public void Presented_Should_Have720PixelsAtMostOnTheShorterSide_When_NeverEnlargingNorChangingTheRatio(
        int width, int height, int presentedWidth, int presentedHeight)
    {
        new VideoDimensions(width, height).Presented().ShouldBe(new VideoDimensions(presentedWidth, presentedHeight));
    }

    [Fact]
    public void IsPortrait_Should_BeTrue_When_TheVideoIsHigherThanWide()
    {
        new VideoDimensions(720, 1280).IsPortrait.ShouldBeTrue();
        new VideoDimensions(1280, 720).IsPortrait.ShouldBeFalse();
    }

    [Fact]
    public void ExceedsTheLimitByMoreThanTheTolerance_Should_BeTrue_When_TheDecodedDurationReaches31AndAHalfSeconds()
    {
        Seconds(31.4).ExceedsTheLimitByMoreThanTheTolerance.ShouldBeFalse();
        Seconds(31.5).ExceedsTheLimitByMoreThanTheTolerance.ShouldBeTrue();
        Seconds(40).ExceedsTheLimitByMoreThanTheTolerance.ShouldBeTrue();
    }
}

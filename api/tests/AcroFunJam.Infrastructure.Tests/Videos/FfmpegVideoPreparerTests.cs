using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Videos;

namespace AcroFunJam.Infrastructure.Tests.Videos;

/// <summary>The command of the preparation (ADR 0041), without running ffmpeg: the bounds of the computation.</summary>
public sealed class FfmpegVideoPreparerTests
{
    private readonly VideoProcessingOptions _options = new() { Threads = 2 };

    [Fact]
    public void EncodingArguments_Should_LimitTheThreadsOfTheDecodingAndOfTheEncoding_When_AVideoIsPrepared()
    {
        var arguments = new FfmpegVideoPreparer(_options, new FfprobeVideoProbe(_options))
            .EncodingArguments(VideoFormat.QuickTime, "original", new VideoDimensions(720, 1280), hdr: false, "prepared.mp4");

        var input = arguments.ToList().IndexOf("-i");
        input.ShouldBePositive();
        Threads(arguments.Take(input)).ShouldBe("2");
        Threads(arguments.Skip(input)).ShouldBe("2");
    }

    private static string? Threads(IEnumerable<string> arguments) =>
        arguments.Zip(arguments.Skip(1)).Where(pair => pair.First == "-threads").Select(pair => pair.Second).SingleOrDefault();
}

using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The file of a video as found by the processing (story 12, V4 to V7): the processing only finds the format, the dimensions and
/// the duration; the domain decides whether the file is accepted.
/// </summary>
public sealed record VideoFile
{
    public VideoFormat Format { get; }
    public VideoFileSize Size { get; }
    public VideoDimensions Dimensions { get; }
    public VideoDuration Duration { get; }

    private VideoFile(VideoFormat format, VideoFileSize size, VideoDimensions dimensions, VideoDuration duration)
    {
        Format = format;
        Size = size;
        Dimensions = dimensions;
        Duration = duration;
    }

    /// <param name="format">The format recognised from the content; none when it is not an accepted one.</param>
    /// <param name="size">The weight of the file as sent.</param>
    /// <param name="dimensions">The dimensions once turned upright; none when the video could not be read.</param>
    /// <param name="duration">The duration found at the demultiplexing; none when it could not be computed.</param>
    public static Result<VideoFile> Accept(VideoFormat? format, VideoFileSize size, VideoDimensions? dimensions, VideoDuration? duration)
    {
        ArgumentNullException.ThrowIfNull(size);
        if (format is not { } accepted) return VideoContentErrors.FormatNotAccepted;
        if (dimensions is null || duration is null) return VideoContentErrors.Unreadable;
        if (duration.IsTooLong) return VideoContentErrors.TooLong(duration.TruncatedSeconds);
        if (duration.IsTooShort) return VideoContentErrors.TooShort;
        if (!dimensions.IsLargeEnough) return VideoContentErrors.TooSmall;
        return Result<VideoFile>.Success(new VideoFile(accepted, size, dimensions, duration));
    }
}

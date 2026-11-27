using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0041): the processing of the videos, ffmpeg and ffprobe run as external processes on local files. It only finds the
/// format, the dimensions and the duration (<see cref="Probe"/>): the domain decides. <see cref="Prepare"/> removes the sound and
/// every metadata, turns the video upright, resizes it to the presented dimensions and extracts its poster.
/// </summary>
public interface IVideoProcessor
{
    /// <summary>
    /// The format recognised from the content (none when it is not an accepted one), the upright dimensions and the duration found
    /// at the demultiplexing (none when the video could not be read).
    /// </summary>
    Task<VideoProbe> Probe(string path, CancellationToken ct);

    /// <summary>The prepared video and its poster, in temporary files, or <see cref="VideoContentErrors.Unreadable"/>.</summary>
    Task<Result<PreparedVideoFiles>> Prepare(string originalPath, VideoDimensions presented, CancellationToken ct);
}

/// <summary>What the processing found in a file.</summary>
public sealed record VideoProbe(VideoFormat? Format, VideoDimensions? Dimensions, VideoDuration? Duration);

/// <summary>
/// The files of a prepared video (MP4 H.264 without sound nor metadata, and its poster in WebP), in temporary files deleted when
/// disposed, and what the preparation found at the decoding.
/// </summary>
public sealed class PreparedVideoFiles(string videoPath, string posterPath, PreparedVideo outcome, Func<ValueTask> cleanUp) : IAsyncDisposable
{
    public string VideoPath { get; } = videoPath;

    public string PosterPath { get; } = posterPath;

    public PreparedVideo Outcome { get; } = outcome;

    public ValueTask DisposeAsync() => cleanUp();
}

/// <summary>A temporary copy of a file on the local disk, deleted when disposed (the original fetched for its preparation).</summary>
public sealed class TemporaryVideoFile(string path, Func<ValueTask> cleanUp) : IAsyncDisposable
{
    public string Path { get; } = path;

    public ValueTask DisposeAsync() => cleanUp();
}

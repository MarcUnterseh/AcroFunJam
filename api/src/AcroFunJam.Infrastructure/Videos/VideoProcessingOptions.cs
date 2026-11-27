namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// Where ffmpeg and ffprobe are, and the local directories of the videos (section <c>VideoProcessing</c> of the configuration,
/// ADR 0041): the files sent, streamed there by the Api, and the work files of the preparations, of the worker. Both directories
/// are emptied when the Api or the worker starts.
/// </summary>
public sealed class VideoProcessingOptions
{
    public const string Section = "VideoProcessing";

    public string FfmpegPath { get; set; } = "ffmpeg";

    public string FfprobePath { get; set; } = "ffprobe";

    public string UploadDirectory { get; set; } = Path.Combine(Path.GetTempPath(), "acrofunjam-uploads");

    public string WorkDirectory { get; set; } = Path.Combine(Path.GetTempPath(), "acrofunjam-videos");

    /// <summary>The threads ffmpeg uses to prepare a video (ADR 0041: one core for the worker container).</summary>
    public int Threads { get; set; } = 2;

    /// <summary>The longest probe of a file sent (ADR 0041).</summary>
    public TimeSpan ProbeTimeout { get; set; } = TimeSpan.FromSeconds(20);

    /// <summary>The longest preparation of a video (ADR 0041).</summary>
    public TimeSpan PreparationTimeout { get; set; } = TimeSpan.FromMinutes(5);
}

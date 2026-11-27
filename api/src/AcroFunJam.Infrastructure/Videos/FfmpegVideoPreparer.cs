using System.Globalization;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// The preparation of a video by ffmpeg (ADR 0041, Q304), behind <see cref="IVideoProcessor.Prepare"/>: MP4 H.264 (libx264
/// veryfast, CRF 23 capped at 2 Mbit/s, high profile, yuv420p, 30 images per second at most, index at the start), a single video
/// track, without sound, subtitles, data, metadata nor chapters, turned upright by the automatic rotation of ffmpeg, resized to the
/// dimensions the domain decided (rounded down to even values), HDR converted to SDR BT.709; then its first image as poster, WebP
/// quality 80. ffmpeg only reads local files, decodes the accepted codecs only, at a lower priority and with a limited number of
/// threads (for the decoding as for the encoding). The duration and the dimensions handed back are those of the prepared file, as ffprobe reads it.
/// </summary>
public sealed class FfmpegVideoPreparer(VideoProcessingOptions options, FfprobeVideoProbe probe)
{
    /// <summary>The decoders of the accepted codecs (ADR 0041): ffmpeg tries no other.</summary>
    private const string Decoders = "h264,hevc,vp8,vp9,av1,libdav1d,libvpx,libvpx-vp9";

    /// <summary>A bound of the computation: a file that lies about its duration is never decoded further (ADR 0041).</summary>
    private const string MaxSeconds = "32";

    private const string ToSdr =
        "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv";

    public async Task<Result<PreparedVideoFiles>> Prepare(string originalPath, VideoDimensions presented, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(presented);
        if (await VideoContainerSniffer.Recognise(originalPath, ct) is not { } format) return VideoContentErrors.Unreadable;
        if (await probe.Inspect(originalPath, format, options.ProbeTimeout, ct) is not { Readable: true } source) return VideoContentErrors.Unreadable;

        Directory.CreateDirectory(options.WorkDirectory);
        var name = Guid.NewGuid().ToString("N");
        var video = Path.Combine(options.WorkDirectory, name + ".mp4");
        var poster = Path.Combine(options.WorkDirectory, name + ".webp");
        ValueTask CleanUp()
        {
            File.Delete(video);
            File.Delete(poster);
            return ValueTask.CompletedTask;
        }

        try
        {
            var encoded = await ExternalProcess.Run(options.FfmpegPath,
                EncodingArguments(format, originalPath, presented, source.IsHdr, video), options.PreparationTimeout, lowPriority: true, ct);
            if (encoded.ExitCode != 0) return await Unreadable(CleanUp);

            var extracted = await ExternalProcess.Run(options.FfmpegPath,
            [
                "-v", "error", "-nostdin",
                "-protocol_whitelist", "file",
                "-f", "mov", "-i", video,
                "-map", "0:v:0", "-frames:v", "1", "-map_metadata", "-1",
                "-c:v", "libwebp", "-quality", "80",
                "-fflags", "+bitexact", "-flags:v", "+bitexact",
                "-f", "webp", "-y", poster,
            ], options.ProbeTimeout, lowPriority: true, ct);
            if (extracted.ExitCode != 0) return await Unreadable(CleanUp);

            if (await probe.Inspect(video, VideoFormat.Mp4, options.ProbeTimeout, ct) is not { DurationMs: { } decoded } prepared)
                return await Unreadable(CleanUp);
            return Result<PreparedVideoFiles>.Success(new PreparedVideoFiles(
                video, poster, new PreparedVideo(prepared.Upright, VideoDuration.FromMilliseconds(decoded)), CleanUp));
        }
        catch
        {
            await CleanUp();
            throw;
        }
    }

    /// <summary>The command of the preparation: the threads limited for the decoding (input option) and for the encoding.</summary>
    internal IReadOnlyList<string> EncodingArguments(VideoFormat format, string originalPath, VideoDimensions presented, bool hdr, string videoPath)
    {
        var threads = options.Threads.ToString(CultureInfo.InvariantCulture);
        // The colours are tagged BT.709 on the frames themselves: recent versions of ffmpeg take the tags from the filters.
        var filters = $"scale={Even(presented.Width)}:{Even(presented.Height)}:flags=lanczos,setsar=1" + (hdr ? "," + ToSdr : string.Empty) +
                      ",format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709";
        return
        [
            "-v", "error", "-nostdin",
            "-protocol_whitelist", "file",
            "-codec_whitelist", Decoders,
            "-threads", threads,
            "-f", VideoContainerSniffer.DemuxerOf(format),
            "-i", originalPath,
            "-map", "0:v:0", "-an", "-sn", "-dn",
            "-map_metadata", "-1", "-map_chapters", "-1",
            "-t", MaxSeconds,
            "-vf", filters,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-maxrate", "2M", "-bufsize", "4M",
            "-profile:v", "high", "-pix_fmt", "yuv420p", "-fpsmax", "30",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            "-movflags", "+faststart",
            "-fflags", "+bitexact", "-flags:v", "+bitexact",
            "-threads", threads,
            "-f", "mp4", "-y", videoPath,
        ];
    }

    private static int Even(int pixels) => Math.Max(2, pixels - (pixels % 2));

    private static async Task<Result<PreparedVideoFiles>> Unreadable(Func<ValueTask> cleanUp)
    {
        await cleanUp();
        return VideoContentErrors.Unreadable;
    }
}

/// <summary>The adapter of <see cref="IVideoProcessor"/> (ADR 0041): ffprobe finds, ffmpeg prepares.</summary>
public sealed class FfmpegVideoProcessor(FfprobeVideoProbe probe, FfmpegVideoPreparer preparer) : IVideoProcessor
{
    public Task<VideoProbe> Probe(string path, CancellationToken ct) => probe.Probe(path, ct);

    public Task<Result<PreparedVideoFiles>> Prepare(string originalPath, VideoDimensions presented, CancellationToken ct) =>
        preparer.Prepare(originalPath, presented, ct);
}

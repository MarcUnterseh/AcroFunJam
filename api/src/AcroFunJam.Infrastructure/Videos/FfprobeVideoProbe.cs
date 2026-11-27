using System.Globalization;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// What ffprobe finds in a file sent (ADR 0041, Q308), behind <see cref="IVideoProcessor.Probe"/>. The container is recognised in C#
/// first; ffprobe is then told the demultiplexer, may only read local files, and reads the packets of the first video track: the
/// duration is the one found at the demultiplexing (the time of the last packet), never the one the header declares. A file
/// without video track, with more than 8 tracks, a codec out of the list, a side over 8192 px, more than 120 images per second, more
/// packets than 120 images per second during 31 seconds, or whose duration cannot be computed, is unreadable. The output of ffprobe
/// (a line per packet) is read as it comes, and only what serves is kept: the first and last times, and the count of packets. The
/// domain decides on the rest.
/// </summary>
public sealed class FfprobeVideoProbe(VideoProcessingOptions options)
{
    private static readonly HashSet<string> AcceptedCodecs = new(StringComparer.Ordinal) { "h264", "hevc", "vp8", "vp9", "av1" };

    private const int MaxStreams = 8;
    private const int MaxSide = 8192;
    private const double MaxFramesPerSecond = 120;

    /// <summary>The packets of the longest video read (31 s, beyond the 30 s allowed) at the highest rate: beyond, ffprobe is stopped.</summary>
    internal const int MaxPackets = (int)MaxFramesPerSecond * 31;

    public async Task<VideoProbe> Probe(string path, CancellationToken ct)
    {
        if (await VideoContainerSniffer.Recognise(path, ct) is not { } format) return new VideoProbe(null, null, null);

        VideoTrack? track;
        try
        {
            track = await Inspect(path, format, options.ProbeTimeout, ct);
        }
        catch (TimeoutException)
        {
            track = null;
        }

        return track is { Readable: true }
            ? new VideoProbe(format, track.Upright, VideoDuration.FromMilliseconds(track.DurationMs!.Value))
            : new VideoProbe(format, null, null);
    }

    /// <summary>The first video track of a file of this format, as its packets show it; none when ffprobe cannot read the file.</summary>
    internal async Task<VideoTrack?> Inspect(string path, VideoFormat format, TimeSpan timeout, CancellationToken ct)
    {
        var reader = new TrackReader();
        var outcome = await ExternalProcess.Run(options.FfprobePath,
        [
            "-v", "error",
            "-protocol_whitelist", "file",
            "-f", VideoContainerSniffer.DemuxerOf(format),
            "-probesize", "50M",
            "-analyzeduration", "60M",
            "-select_streams", "v:0",
            "-show_entries",
            "format=nb_streams:stream=codec_name,width,height,avg_frame_rate,color_transfer:stream_side_data=rotation:packet=pts_time,duration_time",
            "-of", "compact",
            path,
        ], timeout, lowPriority: false, ct, reader.Read);
        return outcome is { ExitCode: 0, Stopped: false } ? reader.Track : null;
    }

    /// <summary>The first video track of a file, as ffprobe described it.</summary>
    internal sealed record VideoTrack(
        string? Codec, int Width, int Height, int Rotation, double FramesPerSecond, string? Transfer, int Streams, long? DurationMs)
    {
        /// <summary>Within the limits of the processing (ADR 0041, Q308).</summary>
        public bool Readable =>
            Codec is not null && AcceptedCodecs.Contains(Codec) && Width > 0 && Height > 0 && Width <= MaxSide && Height <= MaxSide &&
            Streams <= MaxStreams && FramesPerSecond <= MaxFramesPerSecond && DurationMs is > 0;

        /// <summary>The dimensions once turned upright: a rotation of 90° or 270° swaps the width and the height.</summary>
        public VideoDimensions Upright => Math.Abs(Rotation) % 180 == 90 ? new VideoDimensions(Height, Width) : new VideoDimensions(Width, Height);

        /// <summary>A video filmed in HDR (HLG or PQ), converted to SDR at the preparation (ADR 0041).</summary>
        public bool IsHdr => Transfer is "arib-std-b67" or "smpte2084";
    }

    /// <summary>
    /// Reads the output of ffprobe in the <c>compact</c> format, a line per section (<c>packet|pts_time=…|duration_time=…</c>, then
    /// <c>stream|…</c> and <c>format|…</c>), keeping only the first and last times of the packets and their count.
    /// </summary>
    internal sealed class TrackReader
    {
        private int _packets;
        private double? _first;
        private double? _end;
        private Dictionary<string, string>? _stream;
        private int _streams = 1;

        /// <summary>The track read; none without video track.</summary>
        public VideoTrack? Track =>
            _stream is not { } stream
                ? null
                : new VideoTrack(
                    stream.GetValueOrDefault("codec_name"), Number(stream.GetValueOrDefault("width")), Number(stream.GetValueOrDefault("height")),
                    RotationOf(stream), FrameRate(stream.GetValueOrDefault("avg_frame_rate")), stream.GetValueOrDefault("color_transfer"), _streams,
                    _first is { } start && _end is { } stop && stop > start ? (long)Math.Round((stop - start) * 1000) : null);

        /// <summary>Reads a line; <c>false</c> beyond <see cref="MaxPackets"/> packets: the file is unreadable.</summary>
        public bool Read(string line)
        {
            var fields = line.Split('|');
            switch (fields[0])
            {
                case "packet":
                    return ReadPacket(Values(fields));
                case "stream":
                    _stream ??= Values(fields);
                    return true;
                case "format":
                    _streams = Number(Values(fields).GetValueOrDefault("nb_streams")) is > 0 and var count ? count : 1;
                    return true;
                default:
                    return true;
            }
        }

        /// <summary>From the first packet to the end of the last one.</summary>
        private bool ReadPacket(Dictionary<string, string> packet)
        {
            if (++_packets > MaxPackets) return false;
            if (Seconds(packet.GetValueOrDefault("pts_time")) is not { } pts) return true;
            _first = _first is null ? pts : Math.Min(_first.Value, pts);
            var packetEnd = pts + (Seconds(packet.GetValueOrDefault("duration_time")) ?? 0);
            _end = _end is null ? packetEnd : Math.Max(_end.Value, packetEnd);
            return true;
        }

        private static Dictionary<string, string> Values(string[] fields)
        {
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var field in fields.Skip(1))
            {
                var equal = field.IndexOf('=', StringComparison.Ordinal);
                if (equal > 0) values[field[..equal]] = field[(equal + 1)..];
            }

            return values;
        }

        /// <summary>The rotation of the display matrix, whatever the version of ffprobe names its side data (<c>…rotation</c>).</summary>
        private static int RotationOf(Dictionary<string, string> stream) =>
            stream.Where(v => v.Key.EndsWith("rotation", StringComparison.Ordinal)).Select(v => Seconds(v.Value)).FirstOrDefault(r => r is not null) is { } rotation
                ? (int)Math.Round(rotation)
                : 0;

        private static int Number(string? text) =>
            int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) ? number : 0;

        private static double? Seconds(string? text) =>
            double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds) ? seconds : null;

        private static double FrameRate(string? rate)
        {
            var parts = (rate ?? "0/1").Split('/');
            return parts.Length == 2 &&
                   double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var numerator) &&
                   double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var denominator) && denominator > 0
                ? numerator / denominator
                : 0;
        }
    }
}

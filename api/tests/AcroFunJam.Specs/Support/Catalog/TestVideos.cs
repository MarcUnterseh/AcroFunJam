using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>
/// The files of the scenarios, named by their format, duration, weight and dimensions (« une vidéo MP4 de 30 s, 100 Mo, 1920×1080 »,
/// ADR 0041): a header the fake processing reads, then zeros up to the weight, streamed so that no file is held in memory. No
/// binary file is versioned. « une vidéo MP4 de 12 s » is a video of 20 Mo in 1920×1080, with sound.
/// </summary>
public static partial class TestVideoFiles
{
    private const string Header = "AFJ-TEST-VIDEO";

    /// <summary>What a prepared video of the fake processing contains: no sound, no metadata, nothing of the original.</summary>
    public const string PreparedContent = "AFJ-PREPARED-VIDEO";

    /// <summary>What the poster of the fake processing contains: the first image of the prepared video.</summary>
    public const string PosterContent = "AFJ-POSTER-FIRST-IMAGE";

    private const string Video =
        @"une vidéo (?:MP4|MOV|WebM)(?: (?:H\.264|HEVC|VP9))? de \d+(?:,\d+)? s(?: filmée par un iPhone)?(?:, \d+ Mo, \d+×\d+)?" +
        @"(?: avec de la musique)?(?:, avec une position GPS et le modèle de l'appareil)?(?:, marquée « à pivoter de 90° »)?(?: endommagée)?";

    public const string Pattern =
        Video + @"|un GIF animé de \d+ s, \d+ Mo, \d+×\d+|une photo JPEG de \d+ Mo de \d+×\d+|un document PDF de \d+ Mo" +
        @"|un fichier texte nommé « [^»]+ »|une vidéo sans fichier";

    /// <summary>The content sent for a file of the scenarios; none for « une vidéo sans fichier ».</summary>
    public static HttpContent? From(string description)
    {
        if (description == "une vidéo sans fichier") return null;
        if (VideoDescription().Match(description) is { Success: true } video)
        {
            var seconds = double.Parse(video.Groups["seconds"].Value.Replace(',', '.'), CultureInfo.InvariantCulture);
            var megabytes = video.Groups["mo"].Success ? int.Parse(video.Groups["mo"].Value, CultureInfo.InvariantCulture) : 20;
            var (width, height) = video.Groups["w"].Success
                ? (video.Groups["w"].Value, video.Groups["h"].Value)
                : ("1920", "1080");
            var flags = new List<string> { "audio" }; // every video of the scenarios is filmed with a sound
            if (description.Contains("position GPS", StringComparison.Ordinal)) flags.Add("gps");
            if (description.Contains("90° »", StringComparison.Ordinal)) flags.Add("rotate90");
            if (description.EndsWith("endommagée", StringComparison.Ordinal)) flags.Add("damaged");
            return new PaddedContent(
                $"{Header};format={video.Groups["format"].Value};ms={(long)Math.Round(seconds * 1000)};width={width};height={height};{string.Join(';', flags)}\n",
                megabytes * 1024L * 1024);
        }

        var weight = WeightOf().Match(description) is { Success: true } mo ? int.Parse(mo.Groups[1].Value, CultureInfo.InvariantCulture) : 0;
        var content = description.StartsWith("un GIF", StringComparison.Ordinal) ? "GIF89a"
            : description.StartsWith("une photo", StringComparison.Ordinal) ? "ÿØÿJFIF"
            : description.StartsWith("un document", StringComparison.Ordinal) ? "%PDF-1.7"
            : "Pop to Bird, notes de jam";
        return new PaddedContent(content + "\n", Math.Max(weight * 1024L * 1024, content.Length + 1));
    }

    /// <summary>What the fake processing finds in a file of the scenarios.</summary>
    internal static VideoProbe Probe(string path)
    {
        var fields = FieldsOf(path);
        if (fields is null) return new VideoProbe(null, null, null);

        var format = fields["format"] switch
        {
            "MP4" => VideoFormat.Mp4,
            "MOV" => VideoFormat.QuickTime,
            _ => VideoFormat.WebM,
        };
        var (width, height) = (int.Parse(fields["width"], CultureInfo.InvariantCulture), int.Parse(fields["height"], CultureInfo.InvariantCulture));
        var dimensions = fields.ContainsKey("rotate90") ? new VideoDimensions(height, width) : new VideoDimensions(width, height);
        return new VideoProbe(format, dimensions, VideoDuration.FromMilliseconds(long.Parse(fields["ms"], CultureInfo.InvariantCulture)));
    }

    internal static bool IsDamaged(string path) => FieldsOf(path)?.ContainsKey("damaged") == true;

    /// <summary>The header of a test file, the part the fake storage keeps of an original.</summary>
    internal static byte[] HeadOf(string path)
    {
        using var file = File.OpenRead(path);
        var head = new byte[Math.Min(256, file.Length)];
        file.ReadExactly(head);
        return head;
    }

    private static Dictionary<string, string>? FieldsOf(string path)
    {
        var text = Encoding.UTF8.GetString(HeadOf(path));
        if (!text.StartsWith(Header, StringComparison.Ordinal)) return null;
        return text[..text.IndexOf('\n', StringComparison.Ordinal)].Split(';', StringSplitOptions.RemoveEmptyEntries).Skip(1)
            .Select(f => f.Split('=')).ToDictionary(f => f[0], f => f.Length > 1 ? f[1] : string.Empty);
    }

    [GeneratedRegex(@"^une vidéo (?<format>MP4|MOV|WebM)(?: (?:H\.264|HEVC|VP9))? de (?<seconds>\d+(?:,\d+)?) s(?: filmée par un iPhone)?(?:, (?<mo>\d+) Mo, (?<w>\d+)×(?<h>\d+))?")]
    private static partial Regex VideoDescription();

    [GeneratedRegex(@"(\d+) Mo")]
    private static partial Regex WeightOf();

    /// <summary>A header, then zeros up to the weight, written as it is sent.</summary>
    private sealed class PaddedContent(string header, long length) : HttpContent
    {
        private readonly byte[] _header = Encoding.UTF8.GetBytes(header);

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
        {
            await stream.WriteAsync(_header);
            var zeros = new byte[81920];
            for (var left = length - _header.Length; left > 0; left -= zeros.Length)
                await stream.WriteAsync(zeros.AsMemory(0, (int)Math.Min(zeros.Length, left)));
        }

        protected override bool TryComputeLength(out long length1)
        {
            length1 = length;
            return true;
        }
    }
}

/// <summary>
/// Fake of the processing of the videos for the scenarios (ADR 0041): it reads the header of the test files, and prepares a video
/// that only carries <see cref="TestVideoFiles.PreparedContent"/> and a poster that only carries
/// <see cref="TestVideoFiles.PosterContent"/>. A damaged file cannot be prepared.
/// </summary>
public sealed class ScenarioVideoProcessor : IVideoProcessor
{
    public Task<VideoProbe> Probe(string path, CancellationToken ct) => Task.FromResult(TestVideoFiles.Probe(path));

    public async Task<Result<PreparedVideoFiles>> Prepare(string originalPath, VideoDimensions presented, CancellationToken ct)
    {
        if (TestVideoFiles.IsDamaged(originalPath)) return VideoContentErrors.Unreadable;

        var duration = TestVideoFiles.Probe(originalPath).Duration!;
        var video = Path.GetTempFileName();
        var poster = Path.GetTempFileName();
        await File.WriteAllTextAsync(video, TestVideoFiles.PreparedContent, ct);
        await File.WriteAllTextAsync(poster, TestVideoFiles.PosterContent, ct);
        return Result<PreparedVideoFiles>.Success(new PreparedVideoFiles(video, poster, new PreparedVideo(presented, duration), () =>
        {
            File.Delete(video);
            File.Delete(poster);
            return ValueTask.CompletedTask;
        }));
    }
}

/// <summary>In-memory storage of the files of the videos, for a scenario (ADR 0041: RustFS is exercised by the integration tests).</summary>
public sealed class ScenarioVideoStorage : IVideoStorage
{
    private readonly Dictionary<VideoId, byte[]> _originals = [];
    private readonly Dictionary<(VideoId, VideoRendition), byte[]> _prepared = [];

    public Task StoreOriginal(VideoId video, string path, CancellationToken ct)
    {
        // The fake processing only reads the header: the zeros of the weight are not kept.
        lock (_originals) _originals[video] = TestVideoFiles.HeadOf(path);
        return Task.CompletedTask;
    }

    public async Task<TemporaryVideoFile?> FetchOriginal(VideoId video, CancellationToken ct)
    {
        byte[]? head;
        lock (_originals) head = _originals.GetValueOrDefault(video);
        if (head is null) return null;

        var path = Path.GetTempFileName();
        await File.WriteAllBytesAsync(path, head, ct);
        return new TemporaryVideoFile(path, () =>
        {
            File.Delete(path);
            return ValueTask.CompletedTask;
        });
    }

    public async Task StorePrepared(VideoId video, PreparedVideoFiles files, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(files);
        var content = await File.ReadAllBytesAsync(files.VideoPath, ct);
        var poster = await File.ReadAllBytesAsync(files.PosterPath, ct);
        lock (_prepared)
        {
            _prepared[(video, VideoRendition.Video)] = content;
            _prepared[(video, VideoRendition.Poster)] = poster;
        }
    }

    public Task<VideoContent?> Open(VideoId video, VideoRendition rendition, ByteRange? range, CancellationToken ct)
    {
        byte[]? content;
        lock (_prepared) content = _prepared.GetValueOrDefault((video, rendition));
        if (content is null) return Task.FromResult<VideoContent?>(null);
        if (range is null) return Task.FromResult<VideoContent?>(new VideoContent(new MemoryStream(content), content.Length, null));
        if (range.Within(content.Length) is not { } within) return Task.FromResult<VideoContent?>(VideoContent.RangeNotSatisfiable(content.Length));
        return Task.FromResult<VideoContent?>(new VideoContent(
            new MemoryStream(content[(int)within.First..((int)within.Last + 1)]), content.Length, within));
    }

    public Task DeleteOriginal(VideoId video, CancellationToken ct)
    {
        lock (_originals) _originals.Remove(video);
        return Task.CompletedTask;
    }

    public Task Delete(VideoId video, CancellationToken ct)
    {
        lock (_originals) _originals.Remove(video);
        lock (_prepared)
        {
            _prepared.Remove((video, VideoRendition.Video));
            _prepared.Remove((video, VideoRendition.Poster));
        }

        return Task.CompletedTask;
    }
}

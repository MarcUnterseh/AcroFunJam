using System.Text;
using System.Text.RegularExpressions;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>
/// The files of the scenarios, built from their description (« une photo JPEG de 2 Mo de 1600×1200 », ADR 0039): a header the
/// fake processing reads, then padding up to the weight. No binary file is versioned.
/// </summary>
public static partial class TestPhotoFiles
{
    private const string Header = "AFJ-TEST-PHOTO";

    /// <summary>A text written in the metadata of a file, that the generated sizes must never contain.</summary>
    public const string GpsMarker = "GPS:45.7640N,4.8357E;Camera:Pixel 9";

    /// <summary>What the generated sizes of the fake processing contain.</summary>
    public const string RenderedContent = "AFJ-RENDERED-WEBP";

    public const string Pattern =
        @"une photo (?:JPEG|PNG|WebP|HEIC) de \d+ Mo de \d+×\d+(?: avec une position GPS et le modèle de l'appareil| marquée « à pivoter de 90° »)?" +
        @"|un GIF animé de \d+ Mo de \d+×\d+|un document PDF de \d+ Mo|une vidéo MP4 de \d+ Mo|un fichier texte nommé « [^»]+ »|une photo sans fichier";

    public static byte[] From(string description)
    {
        if (description == "une photo sans fichier") return [];
        if (PhotoDescription().Match(description) is { Success: true } photo)
        {
            var meta = description.EndsWith("l'appareil", StringComparison.Ordinal) ? ";" + GpsMarker
                : description.EndsWith("90° »", StringComparison.Ordinal) ? ";rotate90" : string.Empty;
            return Padded(
                $"{Header};format={photo.Groups[1].Value};width={photo.Groups[3].Value};height={photo.Groups[4].Value}{meta}\n",
                int.Parse(photo.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture));
        }

        if (OtherFile().Match(description) is { Success: true } other)
            return Padded($"{other.Groups[1].Value} content\n", other.Groups[2].Success ? int.Parse(other.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture) : 1);

        return Encoding.UTF8.GetBytes("Folded Leaf, notes de jam");
    }

    /// <summary>The header, then zeros up to so many megabytes (10 Mo = 10 MiB, ADR 0039).</summary>
    private static byte[] Padded(string header, int megabytes)
    {
        var bytes = new byte[megabytes * 1024 * 1024];
        Encoding.ASCII.GetBytes(header).CopyTo(bytes, 0);
        return bytes;
    }

    /// <summary>What the fake processing finds in a file of the scenarios.</summary>
    internal static PhotoProbe Probe(ReadOnlyMemory<byte> content)
    {
        var text = Encoding.UTF8.GetString(content.Span[..Math.Min(content.Length, 256)]);
        if (!text.StartsWith(Header, StringComparison.Ordinal)) return new PhotoProbe(null, null);

        var fields = text[..text.IndexOf('\n', StringComparison.Ordinal)].Split(';').Skip(1)
            .Select(f => f.Split('=')).ToDictionary(f => f[0], f => f.Length > 1 ? f[1] : string.Empty);
        var format = Enum.Parse<PhotoFormat>(fields["format"], ignoreCase: true);
        var (width, height) = (int.Parse(fields["width"], System.Globalization.CultureInfo.InvariantCulture), int.Parse(fields["height"], System.Globalization.CultureInfo.InvariantCulture));
        return new PhotoProbe(format, fields.ContainsKey("rotate90") ? new PhotoDimensions(height, width) : new PhotoDimensions(width, height));
    }

    [GeneratedRegex(@"^une photo (JPEG|PNG|WebP|HEIC) de (\d+) Mo de (\d+)×(\d+)")]
    private static partial Regex PhotoDescription();

    [GeneratedRegex(@"^(?:un |une )(GIF animé|document PDF|vidéo MP4)(?: de (\d+) Mo)?")]
    private static partial Regex OtherFile();
}

/// <summary>Fake of the processing of the images for the scenarios (ADR 0039): it reads the header of the test files.</summary>
public sealed class ScenarioPhotoProcessor : IPhotoProcessor
{
    public Task<PhotoProbe> Probe(ReadOnlyMemory<byte> content, CancellationToken ct) => Task.FromResult(TestPhotoFiles.Probe(content));

    /// <summary>Upright, without any metadata: the generated sizes only carry <see cref="TestPhotoFiles.RenderedContent"/>.</summary>
    public Task<Result<PhotoRenditions>> Render(ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        var probe = TestPhotoFiles.Probe(content);
        if (probe.Dimensions is not { } dimensions) return Task.FromResult<Result<PhotoRenditions>>(PhotoContentErrors.Unreadable);
        var rendered = Encoding.ASCII.GetBytes(TestPhotoFiles.RenderedContent);
        return Task.FromResult(Result<PhotoRenditions>.Success(new PhotoRenditions(
        [
            new RenderedPhoto(PhotoRendition.Thumbnail, 192, 192, rendered),
            new RenderedPhoto(PhotoRendition.Page, dimensions.Width, dimensions.Height, rendered),
            new RenderedPhoto(PhotoRendition.Enlarged, dimensions.Width, dimensions.Height, rendered),
        ])));
    }
}

/// <summary>In-memory storage of the generated sizes, for a scenario (ADR 0039: RustFS is exercised by the integration tests).</summary>
public sealed class ScenarioPhotoStorage : IPhotoStorage
{
    private readonly Dictionary<PhotoId, PhotoRenditions> _files = [];

    public Task Store(PhotoId photo, PhotoRenditions renditions, CancellationToken ct)
    {
        lock (_files) _files[photo] = renditions;
        return Task.CompletedTask;
    }

    public Task<Stream?> Open(PhotoId photo, PhotoRendition rendition, CancellationToken ct)
    {
        lock (_files)
            return Task.FromResult<Stream?>(_files.TryGetValue(photo, out var renditions) ? new MemoryStream(renditions.Of(rendition).Content.ToArray()) : null);
    }

    public Task Delete(PhotoId photo, CancellationToken ct)
    {
        lock (_files) _files.Remove(photo);
        return Task.CompletedTask;
    }
}

/// <summary>The photos of the poses of the scenarios without a database: none (story 10).</summary>
public sealed class NoPosePhotos : IPosePhotosRepository
{
    public Task<PosePhotos?> GetFor(PoseId pose, CancellationToken ct) => Task.FromResult<PosePhotos?>(null);

    public Task<bool> Exists(PhotoId photo, CancellationToken ct) => Task.FromResult(false);

    public Task<IReadOnlyDictionary<PoseId, PhotoId>> MainPhotosOf(IReadOnlyCollection<PoseId> poses, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<PoseId, PhotoId>>(new Dictionary<PoseId, PhotoId>());

    public void Save(PosePhotos photos) => throw new InvalidOperationException("Adding a photo needs the database (@Integration).");
}

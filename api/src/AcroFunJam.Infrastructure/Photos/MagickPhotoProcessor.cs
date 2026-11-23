using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using ImageMagick;

namespace AcroFunJam.Infrastructure.Photos;

/// <summary>
/// Magick.NET adapter of <see cref="IPhotoProcessor"/> (ADR 0039). <see cref="Probe"/> only finds the format and the upright
/// dimensions, without decoding the pixels. <see cref="Render"/> decodes with the found format only, turns the photo upright,
/// converts it to sRGB, removes every metadata and generates the sizes in WebP; it never enlarges a photo.
/// The format is recognised in C# from the first bytes: ImageMagick never guesses it, so its other coders (SVG, MVG, MSL,
/// TEXT…, ImageTragick) are never reached. The resource limits guard against decompression bombs, and at most two photos are
/// processed at once.
/// </summary>
public sealed class MagickPhotoProcessor : IPhotoProcessor
{
    private const uint ThumbnailSide = 192;
    private const uint PageSide = 1200;
    private const uint EnlargedSide = 2400;
    private const uint WebPQuality = 80;

    /// <summary>16 000 px on a side and about 100 megapixels at most: a photo of a phone fits, a bomb does not.</summary>
    private const uint MaxSide = 16_000;
    private const ulong MaxArea = 100_000_000;

    /// <summary>The memory ImageMagick may use for the pixels.</summary>
    private const ulong MaxMemory = 512UL * 1024 * 1024;

    private static readonly Dictionary<MagickFormat, PhotoFormat> Accepted = new()
    {
        [MagickFormat.Jpeg] = PhotoFormat.Jpeg,
        [MagickFormat.Png] = PhotoFormat.Png,
        [MagickFormat.WebP] = PhotoFormat.WebP,
        [MagickFormat.Heic] = PhotoFormat.Heic,
    };

    /// <summary>The brands of an ISO box that announce a HEIC or HEIF photo; AVIF is not accepted (R4).</summary>
    private static readonly string[] HeicBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// <summary>The processing holds a decoded photo in memory: at most two at once.</summary>
    private static readonly SemaphoreSlim Processing = new(2, 2);

    static MagickPhotoProcessor()
    {
        ResourceLimits.Width = MaxSide;
        ResourceLimits.Height = MaxSide;
        ResourceLimits.Area = MaxArea;
        ResourceLimits.Memory = MaxMemory;
    }

    public Task<PhotoProbe> Probe(ReadOnlyMemory<byte> content, CancellationToken ct) => Task.FromResult(ProbeOf(content));

    public async Task<Result<PhotoRenditions>> Render(ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        if (Detected(content.Span) is not { } format) return PhotoContentErrors.Unreadable;
        await Processing.WaitAsync(ct);
        try
        {
            using var image = new MagickImage(content.ToArray(), new MagickReadSettings { Format = format });
            image.AutoOrient();
            image.TransformColorSpace(ColorProfiles.SRGB);
            image.Strip();
            // In cascade: each size from the previous one.
            using var enlarged = Fitted(image, EnlargedSide);
            using var page = Fitted(enlarged, PageSide);
            using var thumbnail = Squared(page);
            return Result<PhotoRenditions>.Success(new PhotoRenditions(
            [
                Encoded(thumbnail, PhotoRendition.Thumbnail),
                Encoded(page, PhotoRendition.Page),
                Encoded(enlarged, PhotoRendition.Enlarged),
            ]));
        }
        catch (MagickException)
        {
            return PhotoContentErrors.Unreadable;
        }
        finally
        {
            Processing.Release();
        }
    }

    private static PhotoProbe ProbeOf(ReadOnlyMemory<byte> content)
    {
        if (Detected(content.Span) is not { } format) return new PhotoProbe(null, null);
        var bytes = content.ToArray();
        try
        {
            var info = new MagickImageInfo(bytes, new MagickReadSettings { Format = format });
            if (IsAnimated(format, bytes)) return new PhotoProbe(null, null);
            var turned = info.Orientation is ImageMagick.Orientation.LeftTop or ImageMagick.Orientation.RightTop
                or ImageMagick.Orientation.RightBottom or ImageMagick.Orientation.LeftBottom;
            var (width, height) = turned ? (info.Height, info.Width) : (info.Width, info.Height);
            return new PhotoProbe(Accepted[format], new PhotoDimensions((int)width, (int)height));
        }
        catch (MagickException)
        {
            return new PhotoProbe(Accepted[format], null);
        }
    }

    /// <summary>
    /// The format recognised from the first bytes of the content (JPEG, PNG, WebP, HEIC), in C#, before any call to ImageMagick;
    /// never the name of the file.
    /// </summary>
    private static MagickFormat? Detected(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 12) return null;
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return MagickFormat.Jpeg;
        if (bytes[..8].SequenceEqual(PngSignature)) return MagickFormat.Png;
        if (bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8)) return MagickFormat.WebP;
        if (bytes[4..8].SequenceEqual("ftyp"u8) && HeicBrands.Contains(System.Text.Encoding.ASCII.GetString(bytes[8..12])))
            return MagickFormat.Heic;
        return null;
    }

    /// <summary>An animated WebP is not a photo, like an animated GIF.</summary>
    private static bool IsAnimated(MagickFormat format, byte[] bytes)
    {
        if (format != MagickFormat.WebP) return false;
        using var frames = new MagickImageCollection(bytes, new MagickReadSettings { Format = format });
        return frames.Count > 1;
    }

    /// <summary>A copy with the longer side brought to <paramref name="side"/>, never enlarged.</summary>
    private static MagickImage Fitted(MagickImage image, uint side)
    {
        var copy = (MagickImage)image.Clone();
        if (Math.Max(copy.Width, copy.Height) > side) copy.Resize(new MagickGeometry(side, side) { Greater = true });
        return copy;
    }

    /// <summary>A square where the whole photo is contained, centred, on transparent margins: nothing of the flyer is cut.</summary>
    private static MagickImage Squared(MagickImage image)
    {
        var copy = (MagickImage)image.Clone();
        copy.Resize(new MagickGeometry(ThumbnailSide, ThumbnailSide));
        copy.Alpha(AlphaAction.Set);
        copy.BackgroundColor = MagickColors.Transparent;
        copy.Extent(ThumbnailSide, ThumbnailSide, Gravity.Center);
        return copy;
    }

    private static RenderedPhoto Encoded(MagickImage image, PhotoRendition rendition)
    {
        image.Quality = WebPQuality;
        image.Strip();
        return new RenderedPhoto(rendition, (int)image.Width, (int)image.Height, image.ToByteArray(MagickFormat.WebP));
    }
}

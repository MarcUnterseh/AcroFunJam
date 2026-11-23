using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0039): the processing of the images. It only finds the format and the dimensions (<see cref="Probe"/>): the domain
/// decides. <see cref="Render"/> turns the photo upright, removes every metadata and generates the sizes; the original file is
/// never kept.
/// </summary>
public interface IPhotoProcessor
{
    /// <summary>The format recognised from the content (none when it is not an accepted one) and the upright dimensions.</summary>
    Task<PhotoProbe> Probe(ReadOnlyMemory<byte> content, CancellationToken ct);

    /// <summary>The generated sizes, or <see cref="PhotoContentErrors.Unreadable"/>.</summary>
    Task<Result<PhotoRenditions>> Render(ReadOnlyMemory<byte> content, CancellationToken ct);
}

/// <summary>What the processing found in a file: an accepted format and the dimensions once turned upright, when it could.</summary>
public sealed record PhotoProbe(PhotoFormat? Format, PhotoDimensions? Dimensions);

/// <summary>The sizes generated for a photo (ADR 0039).</summary>
public enum PhotoRendition
{
    /// <summary>Square of 192 px, the photo contained with transparent margins: the thumbnail of the catalog.</summary>
    Thumbnail,

    /// <summary>1200 px on the longer side: the page of a pose.</summary>
    Page,

    /// <summary>2400 px on the longer side: the enlargement.</summary>
    Enlarged,
}

/// <summary>A generated size of a photo, and its content (WebP).</summary>
public sealed record RenderedPhoto(PhotoRendition Rendition, int Width, int Height, ReadOnlyMemory<byte> Content);

/// <summary>The generated sizes of a photo.</summary>
public sealed record PhotoRenditions(IReadOnlyList<RenderedPhoto> All)
{
    public RenderedPhoto Of(PhotoRendition rendition) => All.Single(r => r.Rendition == rendition);
}

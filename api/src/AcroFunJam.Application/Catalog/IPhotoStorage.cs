using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port (ADR 0039): stores the generated sizes of the photos (an object storage compatible with S3).</summary>
public interface IPhotoStorage
{
    Task Store(PhotoId photo, PhotoRenditions renditions, CancellationToken ct);

    /// <summary>The content of a generated size; none when it is not stored.</summary>
    Task<Stream?> Open(PhotoId photo, PhotoRendition rendition, CancellationToken ct);

    /// <summary>Deletes the sizes of a photo, at best: a failure is logged by the adapter, never thrown.</summary>
    Task Delete(PhotoId photo, CancellationToken ct);
}

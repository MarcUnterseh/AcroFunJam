using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetPhotoRendition;

/// <summary>Checks the photo is still one of a pose before reading its size from the storage (ADR 0039).</summary>
internal sealed class GetPhotoRenditionHandler(IPosePhotosRepository photos, IPhotoStorage storage) : IQueryHandler<GetPhotoRendition, Stream>
{
    public async Task<Result<Stream>> Handle(GetPhotoRendition query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        if (!await photos.Exists(query.Photo, ct)) return CatalogErrors.PhotoNotFound;
        return await storage.Open(query.Photo, query.Rendition, ct) is { } content
            ? Result<Stream>.Success(content)
            : CatalogErrors.PhotoNotFound;
    }
}

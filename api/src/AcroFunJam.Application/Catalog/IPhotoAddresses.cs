using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port (ADR 0039): the addresses the site loads the generated sizes of a photo from.</summary>
public interface IPhotoAddresses
{
    PhotoSources Of(PhotoId photo);
}

/// <summary>The addresses of the generated sizes of a photo.</summary>
public sealed record PhotoSources(string Thumbnail, string Page, string Enlarged);

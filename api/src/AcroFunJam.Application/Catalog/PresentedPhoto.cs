using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// A photo as presented (story 10, R17): its alternative text, its credit, its upright dimensions (their ratio reserves its
/// place) and the addresses of its sizes. The confirmation of the rights is never presented.
/// </summary>
public sealed record PresentedPhoto(PhotoId Id, string? AltText, string Credit, int Width, int Height, PhotoSources Sources)
{
    public static PresentedPhoto Of(Photo photo, IPhotoAddresses addresses)
    {
        ArgumentNullException.ThrowIfNull(photo);
        ArgumentNullException.ThrowIfNull(addresses);
        return new(photo.Id, photo.AltText?.Value, photo.Credit.Value, photo.Dimensions.Width, photo.Dimensions.Height, addresses.Of(photo.Id));
    }
}

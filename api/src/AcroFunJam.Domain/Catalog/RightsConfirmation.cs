using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The confirmation, ticked at each addition, that the author authorised the publication, that every person photographed or
/// filmed accepted it and that no minor is recognisable (story 10, R9, Q253; story 12, V14). Kept with who gave it and when
/// (ADR 0039, ADR 0041), never shown. Each kind of file refuses with its own error.
/// </summary>
public sealed record RightsConfirmation(CatalogManagerId ConfirmedBy, DateTimeOffset ConfirmedAt)
{
    /// <summary>The confirmation of the rights on a photo (story 10, R9).</summary>
    public static Result<RightsConfirmation> ForPhoto(bool confirmed, CatalogManagerId by, DateTimeOffset at) =>
        Give(confirmed, by, at, PhotoContentErrors.RightsConfirmationRequired);

    /// <summary>The confirmation of the rights on a video, the people filmed included (story 12, V14).</summary>
    public static Result<RightsConfirmation> ForVideo(bool confirmed, CatalogManagerId by, DateTimeOffset at) =>
        Give(confirmed, by, at, VideoContentErrors.RightsConfirmationRequired);

    private static Result<RightsConfirmation> Give(bool confirmed, CatalogManagerId by, DateTimeOffset at, Error missing) =>
        confirmed ? Result<RightsConfirmation>.Success(new RightsConfirmation(by, at)) : missing;
}

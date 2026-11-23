using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The confirmation, ticked at each addition, that the author authorised the publication, that every person photographed
/// accepted it and that no minor is recognisable (story 10, R9, Q253). Kept with who gave it and when (ADR 0039), never shown.
/// </summary>
public sealed record RightsConfirmation(PhotoManagerId ConfirmedBy, DateTimeOffset ConfirmedAt)
{
    public static Result<RightsConfirmation> Give(bool confirmed, PhotoManagerId by, DateTimeOffset at) =>
        confirmed ? Result<RightsConfirmation>.Success(new RightsConfirmation(by, at)) : PhotoContentErrors.RightsConfirmationRequired;
}

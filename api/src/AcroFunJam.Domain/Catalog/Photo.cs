using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A photo of a pose (story 10): its alternative text and credit, its dimensions once turned upright, the confirmation of the
/// rights, and its rank of addition, which orders the photos after the main one.
/// </summary>
public sealed class Photo : Entity<PhotoId>
{
    public AltText AltText { get; private set; }
    public PhotoCredit Credit { get; private set; }
    public PhotoDimensions Dimensions { get; }
    public RightsConfirmation Rights { get; }
    public int AdditionRank { get; }
    public DateTimeOffset AddedAt { get; }

    private Photo(
        PhotoId id, AltText altText, PhotoCredit credit, PhotoDimensions dimensions, RightsConfirmation rights, int additionRank,
        DateTimeOffset addedAt) : base(id)
    {
        AltText = altText;
        Credit = credit;
        Dimensions = dimensions;
        Rights = rights;
        AdditionRank = additionRank;
        AddedAt = addedAt;
    }

    internal static Photo New(PhotoId id, PhotoFile file, AltText altText, PhotoCredit credit, RightsConfirmation rights, int rank, DateTimeOffset now) =>
        new(id, altText, credit, file.Dimensions, rights, rank, now);

    /// <summary>Restores a photo loaded from storage.</summary>
    public static Photo Rehydrate(
        PhotoId id, AltText altText, PhotoCredit credit, PhotoDimensions dimensions, RightsConfirmation rights, int additionRank,
        DateTimeOffset addedAt) => new(id, altText, credit, dimensions, rights, additionRank, addedAt);

    /// <returns>Whether anything changed.</returns>
    internal bool Correct(AltText altText, PhotoCredit credit)
    {
        if (AltText == altText && Credit == credit) return false;
        AltText = altText;
        Credit = credit;
        return true;
    }
}

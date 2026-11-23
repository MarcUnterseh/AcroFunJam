using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The photos of a pose (story 10, ADR 0039), an aggregate of its own, identified by the pose: adding a photo never changes the
/// pose nor its version (R15). 5 photos at most (R11); the main photo, first presented and thumbnail of the catalog, is kept
/// explicitly; the others follow in the order of addition (R12).
/// </summary>
public sealed class PosePhotos : AggregateRoot<PoseId>
{
    /// <summary>At most 5 photos per pose (R11, Q248).</summary>
    public const int MaxCount = 5;

    private readonly List<Photo> _photos;

    /// <summary>The main photo; none exactly when the pose has no photo.</summary>
    public PhotoId? MainPhotoId { get; private set; }

    private PosePhotos(PoseId poseId, PhotoId? mainPhotoId, IEnumerable<Photo> photos) : base(poseId)
    {
        MainPhotoId = mainPhotoId;
        _photos = [.. photos];
    }

    /// <summary>The photos of a pose that has none yet.</summary>
    public static PosePhotos For(PoseId poseId) => new(poseId, null, []);

    /// <summary>Restores the photos loaded from storage, without raising any event.</summary>
    public static PosePhotos Rehydrate(PoseId poseId, PhotoId? mainPhotoId, IEnumerable<Photo> photos) => new(poseId, mainPhotoId, photos);

    /// <summary>The pose has its 5 photos: no other can be added before one is removed (R11).</summary>
    public bool IsFull => _photos.Count >= MaxCount;

    /// <summary>The main photo, then the others in the order of addition.</summary>
    public IReadOnlyList<Photo> InPresentationOrder() =>
        [.. _photos.OrderBy(p => p.Id == MainPhotoId ? 0 : 1).ThenBy(p => p.AdditionRank)];

    public Result<Photo> Add(PhotoId id, PhotoFile file, AltText altText, PhotoCredit credit, RightsConfirmation rights, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(file);
        if (IsFull) return CatalogErrors.PhotoLimitReached;

        var rank = _photos.Count == 0 ? 1 : _photos.Max(p => p.AdditionRank) + 1;
        var photo = Photo.New(id, file, altText, credit, rights, rank, now);
        _photos.Add(photo);
        MainPhotoId ??= id;
        Raise(new PhotoAdded(Id, id, now));
        return Result<Photo>.Success(photo);
    }

    public Result<Photo> ChooseAsMain(PhotoId id, DateTimeOffset now)
    {
        if (Find(id) is not { } photo) return CatalogErrors.PhotoNotFound;
        if (MainPhotoId == id) return Result<Photo>.Success(photo);

        MainPhotoId = id;
        Raise(new MainPhotoChanged(Id, id, now));
        return Result<Photo>.Success(photo);
    }

    /// <summary>The photo is removed at once; if it was the main photo, the earliest remaining one takes over.</summary>
    public Result<Photo> Remove(PhotoId id, DateTimeOffset now)
    {
        if (Find(id) is not { } photo) return CatalogErrors.PhotoNotFound;

        _photos.Remove(photo);
        if (MainPhotoId == id) MainPhotoId = _photos.OrderBy(p => p.AdditionRank).FirstOrDefault()?.Id;
        Raise(new PhotoRemoved(Id, id, now));
        return Result<Photo>.Success(photo);
    }

    /// <summary>Corrects the alternative text and the credit; changing the file is removing then adding (R14).</summary>
    public Result<Photo> Correct(PhotoId id, AltText altText, PhotoCredit credit, DateTimeOffset now)
    {
        if (Find(id) is not { } photo) return CatalogErrors.PhotoNotFound;

        if (photo.Correct(altText, credit)) Raise(new PhotoCorrected(Id, id, now));
        return Result<Photo>.Success(photo);
    }

    private Photo? Find(PhotoId id) => _photos.SingleOrDefault(p => p.Id == id);
}

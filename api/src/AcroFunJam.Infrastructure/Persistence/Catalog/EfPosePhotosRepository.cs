using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>
/// EF Core adapter of <see cref="IPosePhotosRepository"/> (ADR 0039): the row of the pose (its main photo) and one row per photo.
/// A save inserts the photos read nowhere, updates the texts of the others and deletes the removed ones; the lock
/// <c>pose-photos</c> serialises the writers.
/// </summary>
public sealed class EfPosePhotosRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : IPosePhotosRepository
{
    private readonly HashSet<PoseId> _storedPoses = [];

    /// <summary>The photos of each pose as last read: a later read replaces the snapshot (a photo removed meanwhile is gone).</summary>
    private readonly Dictionary<PoseId, HashSet<PhotoId>> _storedPhotos = [];

    public async Task<PosePhotos?> GetFor(PoseId pose, CancellationToken ct)
    {
        var root = await context.Set<PosePhotosRecord>().AsNoTracking().SingleOrDefaultAsync(p => p.PoseId == pose.Value, ct);
        if (root is null) return null;

        var records = await context.Set<PhotoRecord>().AsNoTracking().Where(p => p.PoseId == pose.Value).ToListAsync(ct);
        var photos = records.Select(ToPhoto).ToList();
        _storedPoses.Add(pose);
        _storedPhotos[pose] = [.. photos.Select(p => p.Id)];
        var posePhotos = PosePhotos.Rehydrate(pose, root.MainPhotoId is { } main ? new PhotoId(main) : null, photos);
        aggregates.Track(posePhotos);
        return posePhotos;
    }

    public Task<bool> Exists(PhotoId photo, CancellationToken ct) => context.Set<PhotoRecord>().AnyAsync(p => p.Id == photo.Value, ct);

    public async Task<IReadOnlyDictionary<PoseId, PhotoId>> MainPhotosOf(IReadOnlyCollection<PoseId> poses, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(poses);
        var ids = poses.Select(p => p.Value).ToList();
        var mains = await context.Set<PosePhotosRecord>().AsNoTracking()
            .Where(p => ids.Contains(p.PoseId) && p.MainPhotoId != null)
            .Select(p => new { p.PoseId, p.MainPhotoId })
            .ToListAsync(ct);
        return mains.ToDictionary(m => new PoseId(m.PoseId), m => new PhotoId(m.MainPhotoId!.Value));
    }

    public void Save(PosePhotos photos)
    {
        ArgumentNullException.ThrowIfNull(photos);
        var root = new PosePhotosRecord { PoseId = photos.Id.Value, MainPhotoId = photos.MainPhotoId?.Value };
        if (_storedPoses.Add(photos.Id)) context.Set<PosePhotosRecord>().Add(root);
        else context.Set<PosePhotosRecord>().Attach(root).Property(p => p.MainPhotoId).IsModified = true;

        var current = photos.InPresentationOrder();
        if (!_storedPhotos.TryGetValue(photos.Id, out var stored)) _storedPhotos[photos.Id] = stored = [];
        foreach (var photo in current)
        {
            if (stored.Add(photo.Id))
            {
                context.Set<PhotoRecord>().Add(ToRecord(photos.Id, photo));
                continue;
            }

            var entry = context.Set<PhotoRecord>().Attach(ToRecord(photos.Id, photo));
            entry.Property(p => p.AltText).IsModified = true;
            entry.Property(p => p.Credit).IsModified = true;
        }

        foreach (var removed in stored.Except(current.Select(p => p.Id)).ToList())
        {
            context.Set<PhotoRecord>().Remove(new PhotoRecord { Id = removed.Value, Credit = string.Empty });
            stored.Remove(removed);
        }

        aggregates.Track(photos);
    }

    private static PhotoRecord ToRecord(PoseId pose, Photo photo) => new()
    {
        Id = photo.Id.Value,
        PoseId = pose.Value,
        AltText = photo.AltText?.Value,
        Credit = photo.Credit.Value,
        Width = photo.Dimensions.Width,
        Height = photo.Dimensions.Height,
        AdditionRank = photo.AdditionRank,
        AddedAt = photo.AddedAt,
        RightsConfirmedBy = photo.Rights.ConfirmedBy.Value,
        RightsConfirmedAt = photo.Rights.ConfirmedAt,
    };

    // Stored data always met the rules when written: breaking them now is a bug.
    private static Photo ToPhoto(PhotoRecord record) =>
        Photo.Rehydrate(
            new PhotoId(record.Id),
            StoredAltText(record),
            PhotoCredit.Create(record.Credit).Value ?? throw Invalid(record, "credit"),
            new PhotoDimensions(record.Width, record.Height),
            new RightsConfirmation(new PhotoManagerId(record.RightsConfirmedBy), record.RightsConfirmedAt),
            record.AdditionRank,
            record.AddedAt);

    private static AltText? StoredAltText(PhotoRecord record)
    {
        var altText = AltText.Create(record.AltText);
        return altText.IsSuccess ? altText.Value : throw Invalid(record, "alternative text");
    }

    private static InvalidOperationException Invalid(PhotoRecord record, string what) => new($"Invalid stored {what} of the photo {record.Id}.");
}

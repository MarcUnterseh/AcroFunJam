using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the photos of the poses (saved by <see cref="Common.IUnitOfWork"/>, story 10, ADR 0039).</summary>
public interface IPosePhotosRepository
{
    /// <summary>The photos of this pose; none when it never had any.</summary>
    Task<PosePhotos?> GetFor(PoseId pose, CancellationToken ct);

    /// <summary>Whether this photo is one of a pose (a removed photo is not).</summary>
    Task<bool> Exists(PhotoId photo, CancellationToken ct);

    /// <summary>The main photo of each of these poses that has one.</summary>
    Task<IReadOnlyDictionary<PoseId, PhotoId>> MainPhotosOf(IReadOnlyCollection<PoseId> poses, CancellationToken ct);

    /// <summary>Adds or updates the photos of a pose.</summary>
    void Save(PosePhotos photos);
}

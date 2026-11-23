using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Fake of <see cref="IPosePhotosRepository"/>: the photos of each pose, in memory.</summary>
internal sealed class FakePosePhotosRepository : IPosePhotosRepository
{
    public Dictionary<PoseId, PosePhotos> Stored { get; } = [];

    public List<PosePhotos> Saved { get; } = [];

    public Task<PosePhotos?> GetFor(PoseId pose, CancellationToken ct) => Task.FromResult(Stored.GetValueOrDefault(pose));

    public Task<bool> Exists(PhotoId photo, CancellationToken ct) =>
        Task.FromResult(Stored.Values.Any(p => p.InPresentationOrder().Any(x => x.Id == photo)));

    public Task<IReadOnlyDictionary<PoseId, PhotoId>> MainPhotosOf(IReadOnlyCollection<PoseId> poses, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<PoseId, PhotoId>>(Stored.Values
            .Where(p => poses.Contains(p.Id) && p.MainPhotoId is not null)
            .ToDictionary(p => p.Id, p => p.MainPhotoId!.Value));

    public void Save(PosePhotos photos)
    {
        Stored[photos.Id] = photos;
        Saved.Add(photos);
    }
}

/// <summary>Fake of <see cref="IPosePhotosLock"/>: records the poses locked, and what was stored when the lock was taken.</summary>
internal sealed class FakePosePhotosLock : IPosePhotosLock
{
    public List<PoseId> Locked { get; } = [];

    /// <summary>Called when the lock is taken (e.g. to add a photo concurrently).</summary>
    public Action? OnLock { get; set; }

    public Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        Locked.Add(pose);
        OnLock?.Invoke();
        return work(ct);
    }
}

/// <summary>
/// Fake of <see cref="IPhotoProcessor"/>: finds what it is told to find, and renders the three sizes as small fake files.
/// </summary>
internal sealed class FakePhotoProcessor : IPhotoProcessor
{
    public PhotoProbe Probe { get; set; } = new(PhotoFormat.Jpeg, new PhotoDimensions(1600, 1200));

    public bool Unreadable { get; set; }

    public int Probes { get; private set; }

    public int Renders { get; private set; }

    Task<PhotoProbe> IPhotoProcessor.Probe(ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        Probes++;
        return Task.FromResult(Probe);
    }

    public Task<Result<PhotoRenditions>> Render(ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        Renders++;
        if (Unreadable) return Task.FromResult<Result<PhotoRenditions>>(PhotoContentErrors.Unreadable);
        return Task.FromResult(Result<PhotoRenditions>.Success(new PhotoRenditions(
        [
            new RenderedPhoto(PhotoRendition.Thumbnail, 192, 192, new byte[] { 1 }),
            new RenderedPhoto(PhotoRendition.Page, 1200, 900, new byte[] { 2 }),
            new RenderedPhoto(PhotoRendition.Enlarged, 1600, 1200, new byte[] { 3 }),
        ])));
    }
}

/// <summary>Fake of <see cref="IPhotoStorage"/>: the stored sizes of each photo, in memory.</summary>
internal sealed class FakePhotoStorage : IPhotoStorage
{
    public Dictionary<PhotoId, PhotoRenditions> Files { get; } = [];

    public List<PhotoId> Deleted { get; } = [];

    public Task Store(PhotoId photo, PhotoRenditions renditions, CancellationToken ct)
    {
        Files[photo] = renditions;
        return Task.CompletedTask;
    }

    public Task<Stream?> Open(PhotoId photo, PhotoRendition rendition, CancellationToken ct) =>
        Task.FromResult<Stream?>(Files.TryGetValue(photo, out var renditions)
            ? new MemoryStream(renditions.Of(rendition).Content.ToArray())
            : null);

    public Task Delete(PhotoId photo, CancellationToken ct)
    {
        Files.Remove(photo);
        Deleted.Add(photo);
        return Task.CompletedTask;
    }
}

/// <summary>Fake of <see cref="IPhotoAddresses"/>: the paths of the API (ADR 0039).</summary>
internal sealed class FakePhotoAddresses : IPhotoAddresses
{
    public PhotoSources Of(PhotoId photo) => new(
        $"/catalog/photos/{photo.Value}/thumbnail", $"/catalog/photos/{photo.Value}/page", $"/catalog/photos/{photo.Value}/enlarged");
}

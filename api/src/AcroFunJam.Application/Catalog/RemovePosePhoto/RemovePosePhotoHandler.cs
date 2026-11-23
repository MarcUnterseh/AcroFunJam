using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RemovePosePhoto;

/// <summary>
/// Removes a photo (ADR 0039): the removal is saved first, so that the photo is no longer found, even by its address; its sizes
/// are deleted afterwards, at best.
/// </summary>
internal sealed class RemovePosePhotoHandler(
    IPosePhotosRepository photos, IPosePhotosLock photosLock, IPhotoStorage storage, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<RemovePosePhoto, PhotoId>
{
    public async Task<Result<PhotoId>> Handle(RemovePosePhoto command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var removed = await photosLock.Run(command.Pose, async lockedCt =>
        {
            if (await photos.GetFor(command.Pose, lockedCt) is not { } posePhotos) return CatalogErrors.PhotoNotFound;
            var photo = posePhotos.Remove(command.Photo, clock.GetUtcNow());
            if (photo.IsFailure) return photo.Error!;

            photos.Save(posePhotos);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<PhotoId>.Success(command.Photo);
        }, ct);

        if (removed.IsSuccess) await storage.Delete(command.Photo, CancellationToken.None);
        return removed;
    }
}

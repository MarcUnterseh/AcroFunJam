using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ChooseMainPhoto;

internal sealed class ChooseMainPhotoHandler(IPosePhotosRepository photos, IPosePhotosLock photosLock, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<ChooseMainPhoto, PhotoId>
{
    public Task<Result<PhotoId>> Handle(ChooseMainPhoto command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        return photosLock.Run(command.Pose, async lockedCt =>
        {
            if (await photos.GetFor(command.Pose, lockedCt) is not { } posePhotos) return CatalogErrors.PhotoNotFound;
            var chosen = posePhotos.ChooseAsMain(command.Photo, clock.GetUtcNow());
            if (chosen.IsFailure) return chosen.Error!;

            photos.Save(posePhotos);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<PhotoId>.Success(command.Photo);
        }, ct);
    }
}

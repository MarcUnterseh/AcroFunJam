using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.CorrectPhoto;

internal sealed class CorrectPhotoHandler(
    IPosePhotosRepository photos, IPosePhotosLock photosLock, IPhotoAddresses addresses, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<CorrectPhoto, PresentedPhoto>
{
    public Task<Result<PresentedPhoto>> Handle(CorrectPhoto command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var altText = AltText.Create(command.AltText);
        if (altText.IsFailure) return Task.FromResult<Result<PresentedPhoto>>(altText.Error!);
        var credit = PhotoCredit.Create(command.Credit);
        if (credit.IsFailure) return Task.FromResult<Result<PresentedPhoto>>(credit.Error!);

        return photosLock.Run(command.Pose, async lockedCt =>
        {
            if (await photos.GetFor(command.Pose, lockedCt) is not { } posePhotos) return CatalogErrors.PhotoNotFound;
            var corrected = posePhotos.Correct(command.Photo, altText.Value!, credit.Value!, clock.GetUtcNow());
            if (corrected.IsFailure) return corrected.Error!;

            photos.Save(posePhotos);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<PresentedPhoto>.Success(PresentedPhoto.Of(corrected.Value!, addresses));
        }, ct);
    }
}

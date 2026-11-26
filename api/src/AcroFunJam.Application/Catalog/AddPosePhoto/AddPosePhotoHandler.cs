using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.AddPosePhoto;

/// <summary>
/// Adds a photo (ADR 0039): the texts and the confirmation are checked before any processing; the file is processed and its
/// sizes stored outside the lock; then, under the lock of the photos of the pose, the aggregate decides (5 at most). If the
/// photo is not added in the end, its stored sizes are deleted.
/// </summary>
internal sealed class AddPosePhotoHandler(
    IPoseRepository poses,
    IPosePhotosRepository photos,
    IPosePhotosLock photosLock,
    IPhotoProcessor processor,
    IPhotoStorage storage,
    IPhotoAddresses addresses,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<AddPosePhoto, PresentedPhoto>
{
    public async Task<Result<PresentedPhoto>> Handle(AddPosePhoto command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var now = clock.GetUtcNow();

        var altText = AltText.Create(command.AltText);
        if (altText.IsFailure) return altText.Error!;
        var credit = PhotoCredit.Create(command.Credit);
        if (credit.IsFailure) return credit.Error!;
        var rights = RightsConfirmation.Give(command.RightsConfirmed, command.By, now);
        if (rights.IsFailure) return rights.Error!;
        var size = PhotoFileSize.Create(command.Content.Length);
        if (size.IsFailure) return size.Error!;

        if (await poses.GetById(command.Pose, ct) is null) return CatalogErrors.PoseNotFound;
        // Fails fast before processing; the decision is the aggregate's, under the lock.
        if ((await photos.GetFor(command.Pose, ct))?.IsFull == true) return CatalogErrors.PhotoLimitReached;

        var probe = await processor.Probe(command.Content, ct);
        var file = PhotoFile.Accept(probe.Format, size.Value!, probe.Dimensions);
        if (file.IsFailure) return file.Error!;
        var renditions = await processor.Render(command.Content, ct);
        if (renditions.IsFailure) return renditions.Error!;

        var id = new PhotoId(Guid.CreateVersion7());
        Result<PresentedPhoto> added;
        try
        {
            await storage.Store(id, renditions.Value!, ct);
            added = await photosLock.Run(command.Pose, async lockedCt =>
            {
                var posePhotos = await photos.GetFor(command.Pose, lockedCt) ?? PosePhotos.For(command.Pose);
                var photo = posePhotos.Add(id, file.Value!, altText.Value, credit.Value!, rights.Value!, now);
                if (photo.IsFailure) return photo.Error!;

                photos.Save(posePhotos);
                var saved = await unitOfWork.SaveChanges(lockedCt);
                if (saved.IsFailure) return saved.Error!;
                return Result<PresentedPhoto>.Success(PresentedPhoto.Of(photo.Value!, addresses));
            }, ct);
        }
        catch
        {
            // Whatever failed (storage, lock, database, cancellation), no stored size is left behind.
            await storage.Delete(id, CancellationToken.None);
            throw;
        }

        if (added.IsFailure) await storage.Delete(id, CancellationToken.None);
        return added;
    }
}

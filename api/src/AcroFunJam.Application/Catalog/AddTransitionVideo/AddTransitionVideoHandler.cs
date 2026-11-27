using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.AddTransitionVideo;

/// <summary>
/// Adds a video (ADR 0041): the texts, the confirmation, the weight, the transition and the maximum are checked before the file is
/// probed; the domain decides on what the probe found; the original is stored outside the lock; then, under the lock of the
/// videos of the transition, the aggregate decides (3 at most) and the preparation is queued in the same transaction. If the
/// video is not added in the end, its original is deleted.
/// </summary>
internal sealed class AddTransitionVideoHandler(
    ITransitionRepository transitions,
    ITransitionVideosRepository videos,
    ITransitionVideosLock videosLock,
    IVideoProcessor processor,
    IVideoStorage storage,
    IVideoPreparationQueue queue,
    IVideoAddresses addresses,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<AddTransitionVideo, PresentedVideo>
{
    public async Task<Result<PresentedVideo>> Handle(AddTransitionVideo command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var now = clock.GetUtcNow();

        var caption = VideoCaption.Create(command.Caption);
        if (caption.IsFailure) return caption.Error!;
        var credit = VideoCredit.Create(command.Credit);
        if (credit.IsFailure) return credit.Error!;
        var description = VideoDescription.Create(command.Description);
        if (description.IsFailure) return description.Error!;
        var rights = RightsConfirmation.ForVideo(command.RightsConfirmed, command.By, now);
        if (rights.IsFailure) return rights.Error!;
        var size = VideoFileSize.Create(command.File?.Length ?? 0);
        if (size.IsFailure) return size.Error!;
        var upload = command.File!;

        if (await transitions.GetById(command.Transition, ct) is null) return CatalogErrors.TransitionNotFound;
        // Fails fast before probing; the decision is the aggregate's, under the lock.
        if ((await videos.GetFor(command.Transition, ct)).IsFull) return CatalogErrors.VideoLimitReached;

        var probe = await processor.Probe(upload.Path, ct);
        var file = VideoFile.Accept(probe.Format, size.Value!, probe.Dimensions, probe.Duration);
        if (file.IsFailure) return file.Error!;

        var id = new VideoId(Guid.CreateVersion7());
        Result<PresentedVideo> added;
        try
        {
            await storage.StoreOriginal(id, upload.Path, ct);
            added = await videosLock.Run(command.Transition, async lockedCt =>
            {
                var transitionVideos = await videos.GetFor(command.Transition, lockedCt);
                var video = transitionVideos.Add(id, file.Value!, caption.Value!, credit.Value!, description.Value, rights.Value!, now);
                if (video.IsFailure) return video.Error!;

                videos.Save(transitionVideos);
                queue.Enqueue(id, command.Transition, now);
                var saved = await unitOfWork.SaveChanges(lockedCt);
                if (saved.IsFailure) return saved.Error!;
                return Result<PresentedVideo>.Success(PresentedVideo.Of(video.Value!, addresses));
            }, ct);
        }
        catch
        {
            // Whatever failed (storage, lock, database, cancellation), no original is left behind.
            await storage.DeleteOriginal(id, CancellationToken.None);
            throw;
        }

        if (added.IsFailure) await storage.DeleteOriginal(id, CancellationToken.None);
        return added;
    }
}

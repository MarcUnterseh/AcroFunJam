using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RemoveTransitionVideo;

/// <summary>
/// Removes a video (ADR 0041): the removal is saved first, so that the video is no longer found, even by its address, and its
/// preparation job goes with it; its files are deleted afterwards, at best.
/// </summary>
internal sealed class RemoveTransitionVideoHandler(
    ITransitionVideosRepository videos, ITransitionVideosLock videosLock, IVideoStorage storage, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<RemoveTransitionVideo, VideoId>
{
    public async Task<Result<VideoId>> Handle(RemoveTransitionVideo command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var removed = await videosLock.Run(command.Transition, async lockedCt =>
        {
            var transitionVideos = await videos.GetFor(command.Transition, lockedCt);
            var video = transitionVideos.Remove(command.Video, clock.GetUtcNow());
            if (video.IsFailure) return video.Error!;

            videos.Save(transitionVideos);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<VideoId>.Success(command.Video);
        }, ct);

        if (removed.IsSuccess) await storage.Delete(command.Video, CancellationToken.None);
        return removed;
    }
}

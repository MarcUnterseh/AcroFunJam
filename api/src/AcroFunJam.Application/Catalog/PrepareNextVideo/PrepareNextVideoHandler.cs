using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.PrepareNextVideo;

/// <summary>
/// Prepares the next video waiting (ADR 0041): claims its job by lease, prepares a local copy of its original outside of any
/// transaction and any lock, stores the prepared files, then records the outcome through the aggregate under the lock of the
/// videos of the transition, removing the job in the same transaction. The original is deleted once the preparation is finished
/// or impossible. A crash leaves the job to be claimed again when its lease expires; at the third claim, the video is declared
/// impossible to prepare without running the preparation again. A video removed meanwhile has the files just produced deleted, as
/// has a video found impossible to prepare once prepared (its decoded duration lied). When the worker stops, the job is given
/// back at once, its attempt not counted.
/// </summary>
internal sealed class PrepareNextVideoHandler(
    IVideoPreparationQueue queue,
    ITransitionVideosRepository videos,
    ITransitionVideosLock videosLock,
    IVideoProcessor processor,
    IVideoStorage storage,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<PrepareNextVideo, bool>
{
    /// <summary>A first attempt and a single new one (ADR 0041).</summary>
    public const int MaxAttempts = 2;

    /// <summary>The longest wait to give a job back when the worker stops (within the grace period of its container).</summary>
    private static readonly TimeSpan ReleaseTimeout = TimeSpan.FromSeconds(10);

    public async Task<Result<bool>> Handle(PrepareNextVideo command, CancellationToken ct)
    {
        if (await queue.Claim(ct) is not { } job) return Result<bool>.Success(false);

        try
        {
            await Prepare(job, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The worker stops: the job is given back at once, its attempt not counted, instead of waiting for its lease.
            using var release = new CancellationTokenSource(ReleaseTimeout);
            await queue.Release(job.Video, release.Token);
            throw;
        }

        return Result<bool>.Success(true);
    }

    private async Task Prepare(VideoPreparationJob job, CancellationToken ct)
    {
        var video = (await videos.GetFor(job.Transition, ct)).InAdditionOrder().SingleOrDefault(v => v.Id == job.Video);
        if (video is null)
        {
            // Removed between the claim and now: its job went with it.
            await storage.Delete(job.Video, CancellationToken.None);
            return;
        }

        if (job.Attempts > MaxAttempts)
        {
            await Record(job, (transitionVideos, now) => transitionVideos.MarkPreparationFailed(job.Video, now), ct);
            return;
        }

        await using var original = await storage.FetchOriginal(job.Video, ct);
        if (original is null)
        {
            await Record(job, (transitionVideos, now) => transitionVideos.MarkPreparationFailed(job.Video, now), ct);
            return;
        }

        var prepared = await processor.Prepare(original.Path, video.Dimensions, ct);
        if (prepared.IsFailure)
        {
            await Record(job, (transitionVideos, now) => transitionVideos.MarkPreparationFailed(job.Video, now), ct);
            return;
        }

        await using var files = prepared.Value!;
        await storage.StorePrepared(job.Video, files, ct);
        var recorded = await Record(job, (transitionVideos, now) => transitionVideos.MarkPrepared(job.Video, files.Outcome, now), ct);
        // A decoded duration that lied at the demultiplexing makes the video impossible to prepare: its files are never served.
        if (recorded is { IsSuccess: true, Value.Preparation: VideoPreparation.Failed }) await storage.Delete(job.Video, CancellationToken.None);
    }

    /// <summary>
    /// Records the outcome and removes the job, then deletes the original; a video removed meanwhile has every file deleted. A
    /// failed save leaves the job to be claimed again.
    /// </summary>
    private async Task<Result<Video>> Record(VideoPreparationJob job, Func<TransitionVideos, DateTimeOffset, Result<Video>> outcome, CancellationToken ct)
    {
        Video? recordedVideo = null;
        var recorded = await videosLock.Run(job.Transition, async lockedCt =>
        {
            var transitionVideos = await videos.GetFor(job.Transition, lockedCt);
            var video = outcome(transitionVideos, clock.GetUtcNow());
            if (video.IsFailure) return video.Error!;

            videos.Save(transitionVideos);
            queue.Complete(job.Video);
            recordedVideo = video.Value;
            return await unitOfWork.SaveChanges(lockedCt);
        }, ct);

        if (recorded.Error == CatalogErrors.VideoNotFound) await storage.Delete(job.Video, CancellationToken.None);
        else if (recorded.IsSuccess) await storage.DeleteOriginal(job.Video, CancellationToken.None);
        return recorded.IsSuccess ? Result<Video>.Success(recordedVideo!) : recorded.Error!;
    }
}

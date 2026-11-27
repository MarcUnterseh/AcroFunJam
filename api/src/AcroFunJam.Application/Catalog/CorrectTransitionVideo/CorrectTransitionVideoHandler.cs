using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.CorrectTransitionVideo;

internal sealed class CorrectTransitionVideoHandler(
    ITransitionVideosRepository videos, ITransitionVideosLock videosLock, IVideoAddresses addresses, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<CorrectTransitionVideo, PresentedVideo>
{
    public Task<Result<PresentedVideo>> Handle(CorrectTransitionVideo command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var caption = VideoCaption.Create(command.Caption);
        if (caption.IsFailure) return Task.FromResult<Result<PresentedVideo>>(caption.Error!);
        var credit = VideoCredit.Create(command.Credit);
        if (credit.IsFailure) return Task.FromResult<Result<PresentedVideo>>(credit.Error!);
        var description = VideoDescription.Create(command.Description);
        if (description.IsFailure) return Task.FromResult<Result<PresentedVideo>>(description.Error!);

        return videosLock.Run(command.Transition, async lockedCt =>
        {
            var transitionVideos = await videos.GetFor(command.Transition, lockedCt);
            var corrected = transitionVideos.Correct(command.Video, caption.Value!, credit.Value!, description.Value, clock.GetUtcNow());
            if (corrected.IsFailure) return corrected.Error!;

            videos.Save(transitionVideos);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<PresentedVideo>.Success(PresentedVideo.Of(corrected.Value!, addresses));
        }, ct);
    }
}

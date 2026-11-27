using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetTransitionVideos;

internal sealed class GetTransitionVideosHandler(ITransitionRepository transitions, ITransitionVideosRepository videos, IVideoAddresses addresses)
    : IQueryHandler<GetTransitionVideos, IReadOnlyList<PresentedVideo>>
{
    public async Task<Result<IReadOnlyList<PresentedVideo>>> Handle(GetTransitionVideos query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        if (await transitions.GetById(query.Transition, ct) is null) return CatalogErrors.TransitionNotFound;

        var transitionVideos = await videos.GetFor(query.Transition, ct);
        return Result<IReadOnlyList<PresentedVideo>>.Success(
            [.. transitionVideos.PresentedTo(VideoAudience.Manager).Select(v => PresentedVideo.Of(v, addresses))]);
    }
}

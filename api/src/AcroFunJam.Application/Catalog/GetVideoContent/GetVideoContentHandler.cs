using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetVideoContent;

/// <summary>
/// Reads the file of a video a visitor sees (V11): still one of a transition, and ready, as the aggregate presents it (ADR 0041).
/// </summary>
internal sealed class GetVideoContentHandler(ITransitionVideosRepository videos, IVideoStorage storage) : IQueryHandler<GetVideoContent, VideoContent>
{
    public async Task<Result<VideoContent>> Handle(GetVideoContent query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        if (await videos.FindByVideo(query.Video, ct) is not { } transitionVideos ||
            !transitionVideos.PresentedTo(VideoAudience.Visitor).Any(v => v.Id == query.Video))
            return CatalogErrors.VideoNotFound;
        return await storage.Open(query.Video, query.Rendition, query.Range, ct) is { } content
            ? Result<VideoContent>.Success(content)
            : CatalogErrors.VideoNotFound;
    }
}

using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ListPublishedPoses;

internal sealed class ListPublishedPosesHandler(IPublishedPosesReader reader, ITagListRepository tagLists)
    : IQueryHandler<ListPublishedPoses, IReadOnlyList<CatalogPose>>
{
    public async Task<Result<IReadOnlyList<CatalogPose>>> Handle(ListPublishedPoses query, CancellationToken ct)
    {
        var poses = await reader.GetPublishedPoses(ct);
        var tags = poses.Any(p => p.Tags.Count > 0)
            ? (await tagLists.Get(ct))?.AllTags.ToDictionary(t => t.Id, t => new PresentedTag(t.Id, t.Name, t.Description))
            : null;
        tags ??= new Dictionary<TagId, PresentedTag>();
        return Result<IReadOnlyList<CatalogPose>>.Success(
            [.. poses.OrderBy(p => p.Name, PoseName.CatalogOrder).Select(p => new CatalogPose(p, PosePage.Presented(p.Tags, tags)))]);
    }
}

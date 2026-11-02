using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ListPublishedPoses;

internal sealed class ListPublishedPosesHandler(IPublishedPosesReader reader)
    : IQueryHandler<ListPublishedPoses, IReadOnlyList<PublishedPoseSummary>>
{
    public async Task<Result<IReadOnlyList<PublishedPoseSummary>>> Handle(ListPublishedPoses query, CancellationToken ct)
    {
        var poses = await reader.GetPublishedPoses(ct);
        return Result<IReadOnlyList<PublishedPoseSummary>>.Success([.. poses.OrderBy(p => p.Name, PoseName.CatalogOrder)]);
    }
}

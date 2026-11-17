using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPosePage;

internal sealed class GetPosePageHandler(IPoseRepository poses, IPoseTransitionsReader transitions, ITagListRepository tagLists)
    : IQueryHandler<GetPosePage, PosePage>
{
    public async Task<Result<PosePage>> Handle(GetPosePage query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var pose = await poses.GetById(query.Id, ct);
        if (pose is null) return CatalogErrors.PoseNotFound;

        var from = await transitions.TransitionsFrom(pose.Id, ct);
        var to = await transitions.TransitionsTo(pose.Id, ct);
        // Removed tags included: a published transition never carries one (ADR 0033), but a removal must not break the page.
        var tags = (await tagLists.Get(ct))?.AllTags.ToDictionary(t => t.Id, t => new PresentedTag(t.Id, t.Name, t.Description))
                   ?? new Dictionary<TagId, PresentedTag>();
        return Result<PosePage>.Success(new PosePage(
            pose.Id, pose.Name, pose.Difficulty, pose.Flow, pose.Version,
            [.. from.Order(LinkedTransitionsOrder.Instance)], [.. to.Order(LinkedTransitionsOrder.Instance)], tags));
    }
}

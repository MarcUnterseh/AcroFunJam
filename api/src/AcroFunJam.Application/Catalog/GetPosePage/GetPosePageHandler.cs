using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetPosePage;

internal sealed class GetPosePageHandler(IPoseRepository poses, IPoseTransitionsReader transitions) : IQueryHandler<GetPosePage, PosePage>
{
    public async Task<Result<PosePage>> Handle(GetPosePage query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var pose = await poses.GetById(query.Id, ct);
        if (pose is null) return CatalogErrors.PoseNotFound;

        var from = await transitions.TransitionsFrom(pose.Id, ct);
        var to = await transitions.TransitionsTo(pose.Id, ct);
        return Result<PosePage>.Success(new PosePage(
            pose.Id, pose.Name, pose.Difficulty, pose.Flow, pose.Version,
            [.. from.Order(LinkedTransitionsOrder.Instance)], [.. to.Order(LinkedTransitionsOrder.Instance)]));
    }
}

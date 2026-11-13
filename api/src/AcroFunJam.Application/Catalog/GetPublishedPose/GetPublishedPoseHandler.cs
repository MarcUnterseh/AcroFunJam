using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetPublishedPose;

internal sealed class GetPublishedPoseHandler(IPoseRepository poses) : IQueryHandler<GetPublishedPose, PublishedPoseDetails>
{
    public async Task<Result<PublishedPoseDetails>> Handle(GetPublishedPose query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var pose = await poses.GetById(query.Id, ct);
        if (pose is null) return CatalogErrors.PoseNotFound;
        return Result<PublishedPoseDetails>.Success(new PublishedPoseDetails(pose.Id, pose.Name, pose.Difficulty, pose.Flow, pose.Version));
    }
}

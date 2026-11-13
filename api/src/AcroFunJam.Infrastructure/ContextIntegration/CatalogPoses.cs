using AcroFunJam.Application.Catalog.GetPublishedPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>Anti-corruption layer Contribution → Catalog (ADR 0016, ADR 0024): a published pose with its version.</summary>
public sealed class CatalogPoses(IQueryHandler<GetPublishedPose, PublishedPoseDetails> getPublishedPose) : ICatalogPoses
{
    public async Task<Result<PublishedPose>> Find(PublishedPoseId id, CancellationToken ct)
    {
        var found = await getPublishedPose.Handle(new GetPublishedPose(new PoseId(id.Value)), ct);
        if (found.IsFailure)
            return found.Error == CatalogErrors.PoseNotFound ? ContributionErrors.PoseNotFound : found.Error!;

        var pose = found.Value!;
        return Result<PublishedPose>.Success(new PublishedPose(
            id, new PriorPose(pose.Name, pose.Difficulty, pose.Flow), new PublishedPoseVersion(pose.Version.Value)));
    }
}

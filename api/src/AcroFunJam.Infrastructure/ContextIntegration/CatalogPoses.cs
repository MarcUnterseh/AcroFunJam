using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.GetPublishedPoseNames;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Contribution → Catalog (ADR 0016, ADR 0024): a published pose with its version, and the current names
/// of published poses (story 7, ADR 0028).
/// </summary>
public sealed class CatalogPoses(
    IQueryHandler<GetPosePage, PosePage> getPosePage,
    IQueryHandler<GetPublishedPoseNames, IReadOnlyDictionary<PoseId, PoseName>> getPublishedPoseNames) : ICatalogPoses
{
    public async Task<Result<PublishedPose>> Find(PublishedPoseId id, CancellationToken ct)
    {
        var found = await getPosePage.Handle(new GetPosePage(new PoseId(id.Value)), ct);
        if (found.IsFailure)
            return found.Error == CatalogErrors.PoseNotFound ? ContributionErrors.PoseNotFound : found.Error!;

        var pose = found.Value!;
        return Result<PublishedPose>.Success(new PublishedPose(
            id,
            new PriorPose(pose.Name, pose.Difficulty, pose.Flow) { Tags = TagSet.Of(pose.PoseTags.Select(t => t.Id)) },
            new PublishedPoseVersion(pose.Version.Value)));
    }

    public async Task<Result<IReadOnlyDictionary<PublishedPoseId, PoseName>>> NamesOf(IReadOnlyCollection<PublishedPoseId> ids, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(ids);
        var names = await getPublishedPoseNames.Handle(new GetPublishedPoseNames([.. ids.Select(id => new PoseId(id.Value)).Distinct()]), ct);
        if (names.IsFailure) return names.Error!;
        return Result<IReadOnlyDictionary<PublishedPoseId, PoseName>>.Success(
            names.Value!.ToDictionary(pair => new PublishedPoseId(pair.Key.Value), pair => pair.Value));
    }
}

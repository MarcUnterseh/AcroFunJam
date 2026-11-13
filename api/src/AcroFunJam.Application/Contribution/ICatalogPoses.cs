using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port (anti-corruption layer towards Catalog): a published pose with its version, to revise it (ADR 0024).</summary>
public interface ICatalogPoses
{
    /// <returns>The pose, <c>contribution.pose-not-found</c> when it is not in the catalog, or the failure of the Catalog.</returns>
    Task<Result<PublishedPose>> Find(PublishedPoseId id, CancellationToken ct);
}

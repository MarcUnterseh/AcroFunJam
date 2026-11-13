using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port (anti-corruption layer towards Catalog): a published pose with its version, to revise it (ADR 0024).</summary>
public interface ICatalogPoses
{
    /// <returns>The pose, <c>contribution.pose-not-found</c> when it is not in the catalog, or the failure of the Catalog.</returns>
    Task<Result<PublishedPose>> Find(PublishedPoseId id, CancellationToken ct);

    /// <summary>
    /// The current names of the published poses among these identifiers, in one batch (story 7, ADR 0028): an identifier left
    /// out is not a published pose (unknown, or still pending validation).
    /// </summary>
    /// <returns>The names, or the failure of the Catalog (never read as "not published").</returns>
    Task<Result<IReadOnlyDictionary<PublishedPoseId, PoseName>>> NamesOf(IReadOnlyCollection<PublishedPoseId> ids, CancellationToken ct);
}

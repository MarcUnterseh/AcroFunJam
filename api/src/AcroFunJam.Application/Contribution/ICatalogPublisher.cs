using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port (anti-corruption layer towards Catalog, ADR 0016): publishes the retained pose of an accepted proposal, in the
/// current transaction. The Catalog may refuse it (e.g. <c>contribution.pose-name-already-in-catalog</c>).
/// </summary>
public interface ICatalogPublisher
{
    Task<Result<bool>> PublishPose(PoseProposalId source, RetainedPose pose, CancellationToken ct);
}

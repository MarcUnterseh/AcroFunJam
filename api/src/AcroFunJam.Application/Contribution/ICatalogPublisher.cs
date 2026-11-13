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

    /// <summary>
    /// Revises a published pose with the retained revision of an accepted revision proposal, from the version it started from
    /// (story 6, ADR 0024, ADR 0026), in the current transaction.
    /// </summary>
    Task<Result<bool>> RevisePose(
        PoseRevisionProposalId source, PublishedPoseId pose, PublishedPoseVersion expected, RetainedPose retained, CancellationToken ct);

    /// <summary>
    /// Publishes the retained transition of an accepted transition proposal between its poses (story 7, ADR 0028), in the current
    /// transaction. The Catalog may refuse it (a pose no longer published, a place taken meanwhile).
    /// </summary>
    Task<Result<bool>> PublishTransition(TransitionProposalId source, TransitionPoses poses, RetainedTransition transition, CancellationToken ct);
}

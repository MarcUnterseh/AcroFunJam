using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Catalog.RevisePose;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Contribution → Catalog (ADR 0016): translates an accepted proposal into the PublishPose
/// command of the Catalog, an accepted revision proposal into its RevisePose command (ADR 0026), and the refusals of the
/// Catalog into the language of Contribution. Runs in the caller's transaction (same scoped DbContext).
/// </summary>
public sealed class CatalogPublisher(ICommandHandler<PublishPose, PoseId> publishPose, ICommandHandler<RevisePose, PoseVersion> revisePose)
    : ICatalogPublisher
{
    public async Task<Result<bool>> PublishPose(PoseProposalId source, RetainedPose pose, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(pose);
        var published = await publishPose.Handle(
            new PublishPose(pose.Name, pose.Difficulty, pose.Flow, new SourceProposalId(source.Value)), ct);
        if (published.IsSuccess) return Result<bool>.Success(true);

        return published.Error == CatalogErrors.PoseNameTaken ? ContributionErrors.PoseNameAlreadyInCatalog : published.Error!;
    }

    public async Task<Result<bool>> RevisePose(
        PoseRevisionProposalId source, PublishedPoseId pose, PublishedPoseVersion expected, RetainedPose retained, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(retained);
        var revised = await revisePose.Handle(
            new RevisePose(
                new PoseId(pose.Value), retained.Name, retained.Difficulty, retained.Flow, PoseVersion.Of(expected.Value),
                new SourceProposalId(source.Value)),
            ct);
        if (revised.IsSuccess) return Result<bool>.Success(true);

        return revised.Error switch
        {
            var e when e == CatalogErrors.PoseNameTaken => ContributionErrors.PoseNameAlreadyInCatalog,
            var e when e == CatalogErrors.PoseVersionMismatch => ContributionErrors.PoseChangedSinceRevisionStarted,
            var e when e == CatalogErrors.PoseNotFound => ContributionErrors.PoseNotFound,
            _ => revised.Error!,
        };
    }
}

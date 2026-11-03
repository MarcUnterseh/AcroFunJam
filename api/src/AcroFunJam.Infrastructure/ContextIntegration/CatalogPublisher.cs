using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Contribution → Catalog (ADR 0016): translates an accepted proposal into the PublishPose
/// command of the Catalog, and the refusals of the Catalog into the language of Contribution. Runs in the
/// caller's transaction (same scoped DbContext).
/// </summary>
public sealed class CatalogPublisher(ICommandHandler<PublishPose, PoseId> publishPose) : ICatalogPublisher
{
    public async Task<Result<bool>> PublishPose(PoseProposalId source, ProposedPose pose, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(pose);
        var published = await publishPose.Handle(
            new PublishPose(pose.Name, pose.Difficulty, pose.Flow, new SourceProposalId(source.Value)), ct);
        if (published.IsSuccess) return Result<bool>.Success(true);

        return published.Error == CatalogErrors.PoseNameTaken ? ContributionErrors.PoseNameAlreadyInCatalog : published.Error!;
    }
}

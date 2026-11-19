using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Catalog → Contribution (ADR 0036): whether a revision of a published pose waits for a decision, read
/// through the query of Contribution; only the fact is read, never who proposed it.
/// </summary>
public sealed class ContributionPendingPoseRevisions(IQueryHandler<GetPendingRevisionOfPose, PendingRevisionOfPose?> pending)
    : IPendingPoseRevisions
{
    /// <summary>Nobody in particular asks: whether the revision is theirs does not matter here.</summary>
    private static readonly ContributorId Nobody = new(Guid.Empty);

    public async Task<bool> IsPending(PoseId pose, CancellationToken ct) =>
        (await pending.Handle(new GetPendingRevisionOfPose(Nobody, new PublishedPoseId(pose.Value)), ct)).Value is not null;
}

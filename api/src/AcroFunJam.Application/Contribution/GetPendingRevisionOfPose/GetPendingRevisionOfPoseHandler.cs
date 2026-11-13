using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;

/// <summary>The pending revision of a pose, if any (null otherwise): one at most (ADR 0025).</summary>
internal sealed class GetPendingRevisionOfPoseHandler(IPoseRevisionProposalRepository revisions)
    : IQueryHandler<GetPendingRevisionOfPose, PendingRevisionOfPose?>
{
    public async Task<Result<PendingRevisionOfPose?>> Handle(GetPendingRevisionOfPose query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var pending = await revisions.GetPendingForPose(query.Pose, ct);
        return Result<PendingRevisionOfPose?>.Success(pending is null ? null : new PendingRevisionOfPose(pending.Contributor == query.Requester));
    }
}

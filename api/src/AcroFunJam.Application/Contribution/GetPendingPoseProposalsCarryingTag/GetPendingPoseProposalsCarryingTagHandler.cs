using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposalsCarryingTag;

internal sealed class GetPendingPoseProposalsCarryingTagHandler(IPendingPoseProposalsReader pending)
    : IQueryHandler<GetPendingPoseProposalsCarryingTag, IReadOnlyList<PoseProposal>>
{
    public async Task<Result<IReadOnlyList<PoseProposal>>> Handle(GetPendingPoseProposalsCarryingTag query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        IReadOnlyList<PoseProposal> carrying = [.. (await pending.ListPending(ct)).Where(p => p.Pose.Tags.Contains(query.Tag))];
        return Result<IReadOnlyList<PoseProposal>>.Success(carrying);
    }
}

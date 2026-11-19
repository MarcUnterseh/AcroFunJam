using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseRevisionsCarryingTag;

internal sealed class GetPendingPoseRevisionsCarryingTagHandler(IPendingPoseRevisionsReader pending)
    : IQueryHandler<GetPendingPoseRevisionsCarryingTag, IReadOnlyList<PoseRevisionProposal>>
{
    public async Task<Result<IReadOnlyList<PoseRevisionProposal>>> Handle(GetPendingPoseRevisionsCarryingTag query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        IReadOnlyList<PoseRevisionProposal> carrying = [.. (await pending.ListPending(ct)).Where(p => p.Revision.After.Tags.Contains(query.Tag))];
        return Result<IReadOnlyList<PoseRevisionProposal>>.Success(carrying);
    }
}

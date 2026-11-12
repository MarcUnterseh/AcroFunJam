using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetMyPoseProposals;

internal sealed class GetMyPoseProposalsHandler(IMyPoseProposalsReader reader)
    : IQueryHandler<GetMyPoseProposals, IReadOnlyList<MyPoseProposal>>
{
    public async Task<Result<IReadOnlyList<MyPoseProposal>>> Handle(GetMyPoseProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var proposals = await reader.ListSubmittedBy(query.Requester, ct);
        // Presented, then ordered, by the domain (ADR 0023): in memory, without pagination (Q27).
        return Result<IReadOnlyList<MyPoseProposal>>.Success([.. proposals.Select(MyPoseProposal.Of).Order(MyProposalsOrder.Instance)]);
    }
}

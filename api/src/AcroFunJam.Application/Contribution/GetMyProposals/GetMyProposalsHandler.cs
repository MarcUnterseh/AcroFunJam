using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetMyProposals;

internal sealed class GetMyProposalsHandler(IMyPoseProposalsReader poseProposals, IMyPoseRevisionsReader revisions)
    : IQueryHandler<GetMyProposals, IReadOnlyList<IMyProposal>>
{
    public async Task<Result<IReadOnlyList<IMyProposal>>> Handle(GetMyProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        // Presented, then ordered, by the domain (ADR 0023, ADR 0027): in memory, without pagination (Q27).
        IEnumerable<IMyProposal> mine =
        [
            .. (await poseProposals.ListSubmittedBy(query.Requester, ct)).Select(MyPoseProposal.Of),
            .. (await revisions.ListSubmittedBy(query.Requester, ct)).Select(MyPoseRevision.Of),
        ];
        return Result<IReadOnlyList<IMyProposal>>.Success([.. mine.Order(MyProposalsOrder.Instance)]);
    }
}

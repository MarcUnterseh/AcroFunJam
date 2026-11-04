using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Contribution.CountPendingPoseProposals;

internal sealed class CountPendingPoseProposalsHandler(IPendingPoseProposalsReader reader) : IQueryHandler<CountPendingPoseProposals, int>
{
    public async Task<Result<int>> Handle(CountPendingPoseProposals query, CancellationToken ct) =>
        Result<int>.Success(await reader.CountPending(ct));
}

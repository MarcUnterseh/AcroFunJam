using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Contribution.CountPendingPoseProposals;

internal sealed class CountPendingPoseProposalsHandler(IPendingPoseProposalsReader reader, IPendingPoseRevisionsReader revisionsReader)
    : IQueryHandler<CountPendingPoseProposals, int>
{
    /// <summary>Pose proposals and revision proposals together, as in the validation queue (ADR 0027).</summary>
    public async Task<Result<int>> Handle(CountPendingPoseProposals query, CancellationToken ct) =>
        Result<int>.Success(await reader.CountPending(ct) + await revisionsReader.CountPending(ct));
}

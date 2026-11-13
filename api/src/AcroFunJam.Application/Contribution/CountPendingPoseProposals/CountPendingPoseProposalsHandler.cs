using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Contribution.CountPendingPoseProposals;

internal sealed class CountPendingPoseProposalsHandler(
    IPendingPoseProposalsReader reader, IPendingPoseRevisionsReader revisionsReader, IPendingTransitionProposalsReader transitionsReader)
    : IQueryHandler<CountPendingPoseProposals, int>
{
    /// <summary>Every kind of proposal together, as in the validation queue (ADR 0027, story 7).</summary>
    public async Task<Result<int>> Handle(CountPendingPoseProposals query, CancellationToken ct) =>
        Result<int>.Success(await reader.CountPending(ct) + await revisionsReader.CountPending(ct) + await transitionsReader.CountPending(ct));
}

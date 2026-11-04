using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the proposals pending validation (the validation queue).</summary>
public interface IPendingPoseProposalsReader
{
    /// <returns>The pending proposals, in no particular order.</returns>
    Task<IReadOnlyList<PoseProposal>> ListPending(CancellationToken ct);

    Task<int> CountPending(CancellationToken ct);
}

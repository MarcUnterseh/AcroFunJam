using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the revision proposals pending validation, for the validation queue (story 6, ADR 0027).</summary>
public interface IPendingPoseRevisionsReader
{
    /// <returns>The pending revision proposals, in no particular order.</returns>
    Task<IReadOnlyList<PoseRevisionProposal>> ListPending(CancellationToken ct);

    Task<int> CountPending(CancellationToken ct);
}

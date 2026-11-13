using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the transition proposals pending validation, for the validation queue (story 7, ADR 0028).</summary>
public interface IPendingTransitionProposalsReader
{
    /// <returns>The pending transition proposals, in no particular order.</returns>
    Task<IReadOnlyList<TransitionProposal>> ListPending(CancellationToken ct);

    Task<int> CountPending(CancellationToken ct);
}

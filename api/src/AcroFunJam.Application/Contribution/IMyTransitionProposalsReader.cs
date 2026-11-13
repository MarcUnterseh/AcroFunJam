using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the transition proposals of a contributor (« Mes propositions », story 7, ADR 0028).</summary>
public interface IMyTransitionProposalsReader
{
    /// <returns>Every transition proposal submitted by this contributor, whatever its status, in no particular order.</returns>
    Task<IReadOnlyList<TransitionProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct);
}

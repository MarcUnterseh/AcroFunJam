using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the proposals of a contributor (« Mes propositions », story 5, ADR 0023).</summary>
public interface IMyPoseProposalsReader
{
    /// <returns>Every proposal submitted by this contributor, whatever its status, in no particular order.</returns>
    Task<IReadOnlyList<PoseProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct);
}

using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: reads the revision proposals of a contributor (« Mes propositions », story 6, ADR 0027).</summary>
public interface IMyPoseRevisionsReader
{
    /// <returns>Every revision proposal submitted by this contributor, whatever its status, in no particular order.</returns>
    Task<IReadOnlyList<PoseRevisionProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct);
}

using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: stores the pose proposals (saved by <see cref="Common.IUnitOfWork"/>).</summary>
public interface IPoseProposalRepository
{
    void Add(PoseProposal proposal);

    /// <returns>The proposal, or <c>null</c> when it does not exist.</returns>
    Task<PoseProposal?> GetById(PoseProposalId id, CancellationToken ct);

    /// <summary>
    /// Records the decision taken on a loaded proposal. Saved only if the proposal is still pending in storage;
    /// otherwise <see cref="Common.IUnitOfWork.SaveChanges"/> fails with <c>contribution.proposal-already-decided</c> (ADR 0022).
    /// </summary>
    void Update(PoseProposal proposal);

    Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct);

    /// <summary>Whether a pending proposal other than <paramref name="except"/> has this name key (an adjusted name, ADR 0022).</summary>
    Task<bool> ExistsOtherPendingWithNameKey(PoseNameKey key, PoseProposalId except, CancellationToken ct);
}

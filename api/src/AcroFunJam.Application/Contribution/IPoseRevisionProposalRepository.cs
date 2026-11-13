using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: stores the pose revision proposals (saved by <see cref="Common.IUnitOfWork"/>, ADR 0026).</summary>
public interface IPoseRevisionProposalRepository
{
    void Add(PoseRevisionProposal proposal);

    /// <summary>Records the decision, only if the revision proposal is still pending in storage (ADR 0022).</summary>
    void Update(PoseRevisionProposal proposal);

    Task<PoseRevisionProposal?> GetById(PoseRevisionProposalId id, CancellationToken ct);

    /// <summary>Whether a pending revision proposes a name with this key, hence reserves it (ADR 0025).</summary>
    Task<bool> ExistsPendingWithReservedNameKey(PoseNameKey key, CancellationToken ct);

    /// <summary>Same, the given revision left out (its own reservation, when it is accepted).</summary>
    Task<bool> ExistsOtherPendingWithReservedNameKey(PoseNameKey key, PoseRevisionProposalId except, CancellationToken ct);

    /// <summary>Whether this published pose has a pending revision: one at most (ADR 0025).</summary>
    Task<bool> ExistsPendingForPose(PublishedPoseId pose, CancellationToken ct);

    /// <summary>The pending revision of this published pose, or null: one at most (ADR 0025).</summary>
    Task<PoseRevisionProposal?> GetPendingForPose(PublishedPoseId pose, CancellationToken ct);
}

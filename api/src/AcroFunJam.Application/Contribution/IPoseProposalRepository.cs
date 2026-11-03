using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: stores the pose proposals (saved by <see cref="Common.IUnitOfWork"/>).</summary>
public interface IPoseProposalRepository
{
    void Add(PoseProposal proposal);

    Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct);
}

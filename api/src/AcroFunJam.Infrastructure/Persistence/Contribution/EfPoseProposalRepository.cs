using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="IPoseProposalRepository"/>.</summary>
public sealed class EfPoseProposalRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : IPoseProposalRepository
{
    public void Add(PoseProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        context.Set<PoseProposalRecord>().Add(ToRecord(proposal));
        aggregates.Track(proposal);
    }

    public Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return context.Set<PoseProposalRecord>().AnyAsync(p => p.NameKey == key.Value && p.Status == PendingStatus, ct);
    }

    private const string PendingStatus = "pending";

    private static PoseProposalRecord ToRecord(PoseProposal proposal) => new()
    {
        Id = proposal.Id.Value,
        ContributorId = proposal.Contributor.Value,
        Name = proposal.Pose.Name.Value,
        NameKey = proposal.Pose.Name.Key.Value,
        BaseDifficulty = proposal.Pose.Difficulty.Base.ToCode(),
        FlyerDifficulty = proposal.Pose.Difficulty.Flyer.ToCode(),
        CanStartFlow = proposal.Pose.Flow.CanStartFlow,
        CanEndFlow = proposal.Pose.Flow.CanEndFlow,
        Status = proposal.Status == ProposalStatus.Accepted ? "accepted" : PendingStatus,
        SubmittedAt = proposal.SubmittedAt,
        AcceptedBy = proposal.AcceptedBy?.Value,
        AcceptedAt = proposal.AcceptedAt,
    };
}

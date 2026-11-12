using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="IMyPoseProposalsReader"/>: the proposals of a contributor, read from contribution.pose_proposals.</summary>
public sealed class EfMyPoseProposalsReader(AcroFunJamDbContext context) : IMyPoseProposalsReader
{
    /// <summary>Through the index ix_pose_proposals_contributor_id; ordered by the domain (MyProposalsOrder).</summary>
    public async Task<IReadOnlyList<PoseProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct) =>
        [
            .. (await context.Set<PoseProposalRecord>().AsNoTracking().Where(p => p.ContributorId == contributor.Value).ToListAsync(ct))
                .Select(PoseProposalRecords.ToProposal),
        ];
}

using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// EF Core adapter of <see cref="IMyPoseRevisionsReader"/>: the revision proposals of a contributor, read from
/// contribution.pose_revision_proposals through ix_pose_revision_proposals_contributor_id (ADR 0027).
/// </summary>
public sealed class EfMyPoseRevisionsReader(AcroFunJamDbContext context) : IMyPoseRevisionsReader
{
    public async Task<IReadOnlyList<PoseRevisionProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct) =>
    [
        .. (await context.Set<PoseRevisionProposalRecord>().AsNoTracking().Where(p => p.ContributorId == contributor.Value).ToListAsync(ct))
            .Select(PoseRevisionProposalRecords.ToProposal),
    ];
}

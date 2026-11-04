using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="IPendingPoseProposalsReader"/>: the validation queue, read from contribution.pose_proposals.</summary>
public sealed class EfPendingPoseProposalsReader(AcroFunJamDbContext context) : IPendingPoseProposalsReader
{
    public async Task<IReadOnlyList<PoseProposal>> ListPending(CancellationToken ct) =>
        [.. (await Pending.ToListAsync(ct)).Select(PoseProposalRecords.ToProposal)];

    public Task<int> CountPending(CancellationToken ct) => Pending.CountAsync(ct);

    private IQueryable<PoseProposalRecord> Pending =>
        context.Set<PoseProposalRecord>().AsNoTracking().Where(p => p.Status == PoseProposalRecords.PendingStatus);
}

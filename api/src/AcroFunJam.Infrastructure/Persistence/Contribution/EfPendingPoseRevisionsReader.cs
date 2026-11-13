using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// EF Core adapter of <see cref="IPendingPoseRevisionsReader"/>: the revision proposals of the validation queue, read from
/// contribution.pose_revision_proposals (ADR 0027).
/// </summary>
public sealed class EfPendingPoseRevisionsReader(AcroFunJamDbContext context) : IPendingPoseRevisionsReader
{
    public async Task<IReadOnlyList<PoseRevisionProposal>> ListPending(CancellationToken ct) =>
        [.. (await Pending.ToListAsync(ct)).Select(PoseRevisionProposalRecords.ToProposal)];

    public Task<int> CountPending(CancellationToken ct) => Pending.CountAsync(ct);

    private IQueryable<PoseRevisionProposalRecord> Pending =>
        context.Set<PoseRevisionProposalRecord>().AsNoTracking().Where(p => p.Status == PoseRevisionProposalRecords.PendingStatus);
}

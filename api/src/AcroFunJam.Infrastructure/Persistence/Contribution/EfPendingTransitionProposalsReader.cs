using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// EF Core adapter of <see cref="IPendingTransitionProposalsReader"/>: the transition proposals of the validation queue, read
/// from contribution.transition_proposals (story 7, ADR 0028).
/// </summary>
public sealed class EfPendingTransitionProposalsReader(AcroFunJamDbContext context) : IPendingTransitionProposalsReader
{
    public async Task<IReadOnlyList<TransitionProposal>> ListPending(CancellationToken ct) =>
        [.. (await Pending.ToListAsync(ct)).Select(TransitionProposalRecords.ToProposal)];

    public Task<int> CountPending(CancellationToken ct) => Pending.CountAsync(ct);

    private IQueryable<TransitionProposalRecord> Pending =>
        context.Set<TransitionProposalRecord>().AsNoTracking().Where(p => p.Status == TransitionProposalRecords.PendingStatus);
}

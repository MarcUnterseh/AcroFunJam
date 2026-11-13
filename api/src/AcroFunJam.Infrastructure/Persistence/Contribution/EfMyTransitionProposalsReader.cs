using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// EF Core adapter of <see cref="IMyTransitionProposalsReader"/>: the transition proposals of a contributor, read from
/// contribution.transition_proposals (index on contributor_id, story 7).
/// </summary>
public sealed class EfMyTransitionProposalsReader(AcroFunJamDbContext context) : IMyTransitionProposalsReader
{
    public async Task<IReadOnlyList<TransitionProposal>> ListSubmittedBy(ContributorId contributor, CancellationToken ct) =>
        [
            .. (await context.Set<TransitionProposalRecord>().AsNoTracking().Where(p => p.ContributorId == contributor.Value).ToListAsync(ct))
                .Select(TransitionProposalRecords.ToProposal),
        ];
}

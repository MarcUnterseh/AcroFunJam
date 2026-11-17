using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingTransitionProposalsCarryingTag;

internal sealed class GetPendingTransitionProposalsCarryingTagHandler(IPendingTransitionProposalsReader pending)
    : IQueryHandler<GetPendingTransitionProposalsCarryingTag, IReadOnlyList<TransitionProposal>>
{
    public async Task<Result<IReadOnlyList<TransitionProposal>>> Handle(GetPendingTransitionProposalsCarryingTag query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        IReadOnlyList<TransitionProposal> carrying = [.. (await pending.ListPending(ct)).Where(p => p.Proposed.Tags.Contains(query.Tag))];
        return Result<IReadOnlyList<TransitionProposal>>.Success(carrying);
    }
}

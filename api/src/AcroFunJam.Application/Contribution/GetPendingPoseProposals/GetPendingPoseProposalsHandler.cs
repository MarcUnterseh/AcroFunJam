using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposals;

internal sealed class GetPendingPoseProposalsHandler(IPendingPoseProposalsReader reader, IContributorEmails contributorEmails)
    : IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingPoseProposalDto>>
{
    public async Task<Result<IReadOnlyList<PendingPoseProposalDto>>> Handle(GetPendingPoseProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var queue = (await reader.ListPending(ct)).Order(PendingProposalOrder.Instance).ToList();
        // The addresses of the whole queue in a single query (ADR 0022); a deleted account has none.
        var emails = await contributorEmails.Of([.. queue.Select(p => p.Contributor).Distinct()], ct);
        return Result<IReadOnlyList<PendingPoseProposalDto>>.Success([.. queue.Select(p => Present(p, emails, query.Requester))]);
    }

    private static PendingPoseProposalDto Present(
        PoseProposal proposal, IReadOnlyDictionary<ContributorId, string> emails, ValidatorId requester) =>
        new(
            proposal.Id,
            proposal.Pose,
            emails.GetValueOrDefault(proposal.Contributor),
            IsYou: proposal.WasSubmittedBy(requester),
            proposal.SubmittedAt);
}

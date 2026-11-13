using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposals;

internal sealed class GetPendingPoseProposalsHandler(
    IPendingPoseProposalsReader reader, IPendingPoseRevisionsReader revisionsReader, IContributorEmails contributorEmails)
    : IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingProposalDto>>
{
    public async Task<Result<IReadOnlyList<PendingProposalDto>>> Handle(GetPendingPoseProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        // Both kinds in a single queue, ordered by the domain (ADR 0027).
        IReadOnlyList<IPendingProposal> queue =
        [
            .. (await reader.ListPending(ct)).Cast<IPendingProposal>().Concat(await revisionsReader.ListPending(ct)).Order(PendingProposalOrder.Instance),
        ];
        // The addresses of the whole queue in a single query (ADR 0022); a deleted account has none.
        var emails = await contributorEmails.Of([.. queue.Select(ContributorOf).Distinct()], ct);
        return Result<IReadOnlyList<PendingProposalDto>>.Success([.. queue.Select(p => Present(p, emails, query.Requester))]);
    }

    private static ContributorId ContributorOf(IPendingProposal proposal) => proposal switch
    {
        PoseProposal pose => pose.Contributor,
        PoseRevisionProposal revision => revision.Contributor,
        _ => throw new ArgumentOutOfRangeException(nameof(proposal), proposal.GetType().Name, "Unknown kind of proposal."),
    };

    private static PendingProposalDto Present(IPendingProposal proposal, IReadOnlyDictionary<ContributorId, string> emails, ValidatorId requester) =>
        proposal switch
        {
            PoseProposal pose => new PendingPoseProposalDto(
                pose.Id, pose.Pose, emails.GetValueOrDefault(pose.Contributor), IsYou: pose.WasSubmittedBy(requester), pose.SubmittedAt),
            PoseRevisionProposal revision => new PendingPoseRevisionDto(
                revision.Id,
                revision.Pose,
                revision.Revision.Before,
                revision.Revision.Changes,
                revision.Message,
                emails.GetValueOrDefault(revision.Contributor),
                IsYou: revision.WasSubmittedBy(requester),
                revision.SubmittedAt),
            _ => throw new ArgumentOutOfRangeException(nameof(proposal), proposal.GetType().Name, "Unknown kind of proposal."),
        };
}

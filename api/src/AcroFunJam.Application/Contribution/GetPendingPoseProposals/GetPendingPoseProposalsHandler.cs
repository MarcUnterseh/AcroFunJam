using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposals;

internal sealed class GetPendingPoseProposalsHandler(
    IPendingPoseProposalsReader reader,
    IPendingPoseRevisionsReader revisionsReader,
    IContributorEmails contributorEmails,
    IPendingTransitionProposalsReader transitionsReader,
    ICatalogPoses catalogPoses)
    : IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingProposalDto>>
{
    public async Task<Result<IReadOnlyList<PendingProposalDto>>> Handle(GetPendingPoseProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var transitions = await PendingTransitions(ct);
        if (transitions.IsFailure) return transitions.Error!;
        // Every kind in a single queue, ordered by the domain (ADR 0027).
        IReadOnlyList<IPendingProposal> queue =
        [
            .. (await reader.ListPending(ct)).Cast<IPendingProposal>()
                .Concat(await revisionsReader.ListPending(ct))
                .Concat(transitions.Value!)
                .Order(PendingProposalOrder.Instance),
        ];
        // The addresses of the whole queue in a single query (ADR 0022); a deleted account has none.
        var emails = await contributorEmails.Of([.. queue.Select(ContributorOf).Distinct()], ct);
        return Result<IReadOnlyList<PendingProposalDto>>.Success([.. queue.Select(p => Present(p, emails, query.Requester))]);
    }

    /// <summary>The pending transition proposals with the current names of their poses, read in one batch (story 7).</summary>
    private async Task<Result<IReadOnlyList<PendingTransitionProposal>>> PendingTransitions(CancellationToken ct)
    {
        var pending = await transitionsReader.ListPending(ct);
        if (pending.Count == 0) return Result<IReadOnlyList<PendingTransitionProposal>>.Success([]);
        var names = await catalogPoses.NamesOf([.. pending.SelectMany(p => new[] { p.Poses.From, p.Poses.To }).Distinct()], ct);
        if (names.IsFailure) return names.Error!;
        // The poses of the catalog are never removed: a missing name is a bug.
        return Result<IReadOnlyList<PendingTransitionProposal>>.Success(
            [.. pending.Select(p => PendingTransitionProposal.Of(p, names.Value![p.Poses.From], names.Value[p.Poses.To]))]);
    }

    private static ContributorId ContributorOf(IPendingProposal proposal) => proposal switch
    {
        PendingTransitionProposal transition => transition.Proposal.Contributor,
        PoseProposal pose => pose.Contributor,
        PoseRevisionProposal revision => revision.Contributor,
        _ => throw new ArgumentOutOfRangeException(nameof(proposal), proposal.GetType().Name, "Unknown kind of proposal."),
    };

    private static PendingProposalDto Present(IPendingProposal proposal, IReadOnlyDictionary<ContributorId, string> emails, ValidatorId requester) =>
        proposal switch
        {
            PendingTransitionProposal transition => new PendingTransitionProposalDto(
                transition.Proposal.Id,
                transition.Proposal.Poses,
                transition.FromPoseName,
                transition.ToPoseName,
                transition.Proposal.Proposed,
                emails.GetValueOrDefault(transition.Proposal.Contributor),
                IsYou: transition.Proposal.WasSubmittedBy(requester),
                transition.SubmittedAt),
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

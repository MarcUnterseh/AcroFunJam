using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetMyProposals;

internal sealed class GetMyProposalsHandler(
    IMyPoseProposalsReader poseProposals,
    IMyPoseRevisionsReader revisions,
    IMyTransitionProposalsReader transitions,
    ICatalogPoses catalogPoses) : IQueryHandler<GetMyProposals, IReadOnlyList<IMyProposal>>
{
    public async Task<Result<IReadOnlyList<IMyProposal>>> Handle(GetMyProposals query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var myTransitions = await MyTransitions(query.Requester, ct);
        if (myTransitions.IsFailure) return myTransitions.Error!;
        // Presented, then ordered, by the domain (ADR 0023, ADR 0027): in memory, without pagination (Q27).
        IEnumerable<IMyProposal> mine =
        [
            .. (await poseProposals.ListSubmittedBy(query.Requester, ct)).Select(MyPoseProposal.Of),
            .. (await revisions.ListSubmittedBy(query.Requester, ct)).Select(MyPoseRevision.Of),
            .. myTransitions.Value!,
        ];
        return Result<IReadOnlyList<IMyProposal>>.Success([.. mine.Order(MyProposalsOrder.Instance)]);
    }

    /// <summary>The transitions of the contributor with the current names of their poses, read in one batch (story 7).</summary>
    private async Task<Result<IReadOnlyList<MyTransitionProposal>>> MyTransitions(ContributorId contributor, CancellationToken ct)
    {
        var proposed = await transitions.ListSubmittedBy(contributor, ct);
        if (proposed.Count == 0) return Result<IReadOnlyList<MyTransitionProposal>>.Success([]);
        var names = await catalogPoses.NamesOf([.. proposed.SelectMany(p => new[] { p.Poses.From, p.Poses.To }).Distinct()], ct);
        if (names.IsFailure) return names.Error!;
        // The poses of the catalog are never removed: a missing name is a bug.
        return Result<IReadOnlyList<MyTransitionProposal>>.Success(
            [.. proposed.Select(p => MyTransitionProposal.Of(p, names.Value![p.Poses.From], names.Value[p.Poses.To]))]);
    }
}

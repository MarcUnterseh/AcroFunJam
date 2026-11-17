using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RemoveTag;

internal sealed class RemoveTagHandler(
    ITagListRepository lists,
    ITagCarriersReader transitions,
    IPendingTagCarriers proposals,
    IPoseRepository poses,
    ITagListLock tagListLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<RemoveTag, bool>
{
    public Task<Result<bool>> Handle(RemoveTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // Exclusive lock: no tag is set meanwhile (a proposal, an acceptance, a direct tagging), so the carriers read stay true (ADR 0033).
        return tagListLock.Exclusive(async lockedCt =>
        {
            if (await lists.Get(lockedCt) is not { } list) return CatalogErrors.TagNotFound;

            var carriers = new TagCarriers(await transitions.TransitionsCarrying(command.Id, lockedCt), await PendingProposals(command, lockedCt));
            var removed = list.Remove(command.Id, clock.GetUtcNow(), carriers);
            if (removed.IsFailure) return removed.Error!;

            lists.Update(list);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<bool>.Success(true);
        }, ct);
    }

    /// <summary>The pending proposals carrying the tag, with the current names of their poses, read in the catalog.</summary>
    private async Task<IReadOnlyList<CarryingTransition>> PendingProposals(RemoveTag command, CancellationToken ct)
    {
        var pending = await proposals.ProposalsCarrying(command.Id, ct);
        if (pending.Count == 0) return [];
        var names = await poses.NamesOf([.. pending.SelectMany(p => new[] { p.FromPose, p.ToPose }).Distinct()], ct);
        // A pose is never removed from the catalog: a missing name is a bug of the stored data.
        return [.. pending.Select(p => new CarryingTransition(p.Id, p.FromPose, names[p.FromPose], p.ToPose, names[p.ToPose], p.Name))];
    }
}

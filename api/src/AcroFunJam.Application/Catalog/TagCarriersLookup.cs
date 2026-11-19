using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// What carries a tag (ADR 0033, ADR 0036), read under the lock of the list: the published poses and transitions, and the pending
/// proposals of Contribution with the current names of their poses, read in the catalog.
/// </summary>
internal sealed class TagCarriersLookup(ITagCarriersReader transitions, IPendingTagCarriers proposals, IPoseRepository poses)
{
    public async Task<TagCarriers> Of(TagId tag, CancellationToken ct) =>
        new(
            await transitions.TransitionsCarrying(tag, ct),
            await PendingProposals(tag, ct),
            await transitions.PosesCarrying(tag, ct),
            await proposals.PosesCarrying(tag, ct));

    private async Task<IReadOnlyList<CarryingTransition>> PendingProposals(TagId tag, CancellationToken ct)
    {
        var pending = await proposals.ProposalsCarrying(tag, ct);
        if (pending.Count == 0) return [];
        var names = await poses.NamesOf([.. pending.SelectMany(p => new[] { p.FromPose, p.ToPose }).Distinct()], ct);
        // A pose is never removed from the catalog: a missing name is a bug of the stored data.
        return [.. pending.Select(p => new CarryingTransition(p.Id, p.FromPose, names[p.FromPose], p.ToPose, names[p.ToPose], p.Name))];
    }
}

using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.GetPendingTransitionProposalsCarryingTag;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Catalog → Contribution (ADR 0033): the pending proposals carrying a tag, read when it is removed, translated
/// into the language of the Catalog (its pose identifiers).
/// </summary>
public sealed class ContributionPendingTagCarriers(
    IQueryHandler<GetPendingTransitionProposalsCarryingTag, IReadOnlyList<TransitionProposal>> pending) : IPendingTagCarriers
{
    public async Task<IReadOnlyList<PendingTagCarrier>> ProposalsCarrying(TagId tag, CancellationToken ct) =>
        [.. (await pending.Handle(new GetPendingTransitionProposalsCarryingTag(tag), ct)).Value!.Select(p => new PendingTagCarrier(
            p.Id.Value, new Domain.Catalog.PoseId(p.Poses.From.Value), new Domain.Catalog.PoseId(p.Poses.To.Value), p.Proposed.Name))];
}

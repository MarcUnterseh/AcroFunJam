using AcroFunJam.Application.Catalog.IsTransitionSlotPublished;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>Anti-corruption layer Contribution → Catalog (ADR 0016, ADR 0029): whether a published transition takes a place.</summary>
public sealed class CatalogTransitions(IQueryHandler<IsTransitionSlotPublished, bool> isSlotPublished) : ICatalogTransitions
{
    public Task<Result<bool>> IsSlotTaken(TransitionSlot slot, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(slot);
        return isSlotPublished.Handle(
            new IsTransitionSlotPublished(new PoseId(slot.Poses.From.Value), new PoseId(slot.Poses.To.Value), slot.NameKey), ct);
    }
}

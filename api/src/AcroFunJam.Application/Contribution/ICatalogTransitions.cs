using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port (anti-corruption layer towards Catalog): whether a published transition takes a place between two poses (ADR 0029).</summary>
public interface ICatalogTransitions
{
    /// <returns>Whether the place is taken in the catalog, or the failure of the Catalog (never read as "free").</returns>
    Task<Result<bool>> IsSlotTaken(TransitionSlot slot, CancellationToken ct);
}

using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the published transitions (saved by <see cref="Common.IUnitOfWork"/>, story 7, ADR 0028).</summary>
public interface ITransitionRepository
{
    void Add(Transition transition);

    /// <summary>The published transition with this identifier, if any.</summary>
    Task<Transition?> GetById(TransitionId id, CancellationToken ct);

    /// <summary>Saves the new tags of a published transition (the last action wins, ADR 0033).</summary>
    void Update(Transition transition);

    /// <summary>
    /// Whether a published transition takes this place between these poses, in this direction (ADR 0029): that of this name key,
    /// or the unnamed place when none is given.
    /// </summary>
    Task<bool> IsSlotTaken(PoseId from, PoseId to, TransitionNameKey? nameKey, CancellationToken ct);
}

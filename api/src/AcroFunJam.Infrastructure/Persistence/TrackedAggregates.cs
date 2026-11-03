using AcroFunJam.Domain.Common;

namespace AcroFunJam.Infrastructure.Persistence;

/// <summary>
/// Aggregates handed to the repositories during a use case (one instance per scope), whose domain events the unit
/// of work clears once saved. No subscriber exists yet: dispatching will happen here (ADR 0016).
/// </summary>
public sealed class TrackedAggregates
{
    private readonly List<Action> _clearEvents = [];

    public void Track<TId>(AggregateRoot<TId> aggregate) where TId : notnull
    {
        ArgumentNullException.ThrowIfNull(aggregate);
        _clearEvents.Add(aggregate.ClearDomainEvents);
    }

    public void ClearDomainEvents()
    {
        foreach (var clear in _clearEvents) clear();
        _clearEvents.Clear();
    }
}

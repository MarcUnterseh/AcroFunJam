namespace AcroFunJam.Domain.Common;

/// <summary>Object defined by its identity rather than by its attributes.</summary>
public abstract class Entity<TId> where TId : notnull
{
    public TId Id { get; }

    protected Entity(TId id) => Id = id;

    public override bool Equals(object? obj) =>
        obj is Entity<TId> other && GetType() == other.GetType() && Id.Equals(other.Id);

    public override int GetHashCode() => Id.GetHashCode();
}

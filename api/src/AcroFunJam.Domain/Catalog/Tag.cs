using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A tag of the list (story 8, ADR 0032): its name, its description and the tag it implies (« dynamique » for « pop »),
/// a relation that survives renaming. Once removed, it is out of the list but stays known for the history. Changed only
/// through its <see cref="TagList"/>.
/// </summary>
public sealed class Tag : Entity<TagId>
{
    public TagName Name { get; private set; }

    public TagDescription Description { get; private set; }

    /// <summary>The tag this one adds when chosen, if any (ADR 0032); inert once that tag has been removed.</summary>
    public TagId? ImpliedTag { get; }

    public DateTimeOffset? RemovedAt { get; private set; }

    public bool IsInTheList => RemovedAt is null;

    private Tag(TagId id, TagName name, TagDescription description, TagId? impliedTag, DateTimeOffset? removedAt) : base(id)
    {
        Name = name;
        Description = description;
        ImpliedTag = impliedTag;
        RemovedAt = removedAt;
    }

    internal static Tag New(TagId id, TagName name, TagDescription description, TagId? impliedTag) => new(id, name, description, impliedTag, null);

    internal void Rename(TagName name) => Name = name;

    internal void Describe(TagDescription description) => Description = description;

    internal void Remove(DateTimeOffset now) => RemovedAt = now;

    /// <summary>Restores a tag loaded from storage.</summary>
    public static Tag Rehydrate(TagId id, TagName name, TagDescription description, TagId? impliedTag, DateTimeOffset? removedAt)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(description);
        return new Tag(id, name, description, impliedTag, removedAt);
    }
}

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The tags of a transition, published or proposed (story 8, ADR 0033): each at most once, the order not counting. Shared by
/// Catalog and Contribution (ADR 0015).
/// </summary>
public sealed class TagSet : IEquatable<TagSet>
{
    private readonly HashSet<TagId> _tags;

    private TagSet(IEnumerable<TagId> tags) => _tags = [.. tags];

    public static TagSet Empty { get; } = new([]);

    public static TagSet Of(IEnumerable<TagId> tags) => new(tags);

    public int Count => _tags.Count;

    public bool Contains(TagId tag) => _tags.Contains(tag);

    /// <summary>The identifiers of the tags, in no particular order.</summary>
    public IReadOnlyCollection<TagId> Ids => _tags;

    public bool Equals(TagSet? other) => other is not null && _tags.SetEquals(other._tags);

    public override bool Equals(object? obj) => Equals(obj as TagSet);

    // Independent of the order: the sum of the hash codes.
    public override int GetHashCode() => _tags.Aggregate(0, (hash, tag) => unchecked(hash + tag.GetHashCode()));

    public static bool operator ==(TagSet? left, TagSet? right) => left is null ? right is null : left.Equals(right);

    public static bool operator !=(TagSet? left, TagSet? right) => !(left == right);
}

/// <summary>
/// The tags chosen through the list for an element (ADR 0033, ADR 0035): those of the list that apply to it, completed with
/// the tags they imply (« dynamique » for « pop »), those that are not in the list, and those that do not apply to it.
/// </summary>
public sealed record TagChoice(TagSet Tags, TagSet NotInList, TagSet NotApplicable)
{
    public TagChoice(TagSet tags, TagSet notInList) : this(tags, notInList, TagSet.Empty)
    {
    }

    public bool IsValid => NotInList.Count == 0 && NotApplicable.Count == 0;
}

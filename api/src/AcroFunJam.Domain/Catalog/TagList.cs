using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The closed list of tags of the catalog (story 8, ADR 0032), a single aggregate: the uniqueness of the names, the
/// implications between tags and the removal are rules of the whole list. Managed by the validators and the administrators,
/// without proposal; consulted by everybody.
/// </summary>
public sealed class TagList : AggregateRoot<TagListId>
{
    private readonly List<Tag> _tags;

    /// <summary>When the list was seeded with the initial tags; none for a list started empty (never in production).</summary>
    public DateTimeOffset? SeededAt { get; }

    /// <summary>The tags of the list, in catalog order (Q130).</summary>
    public IReadOnlyList<Tag> Tags => [.. _tags.Where(t => t.IsInTheList).OrderBy(t => t.Name, TagName.CatalogOrder)];

    /// <summary>Every tag ever in the list, removed ones included (history, storage).</summary>
    public IReadOnlyList<Tag> AllTags => _tags;

    private TagList(DateTimeOffset? seededAt, IEnumerable<Tag> tags) : base(TagListId.Catalog)
    {
        SeededAt = seededAt;
        _tags = [.. tags];
    }

    /// <summary>A list without tag, started by a management use case when none has been seeded (the scenarios).</summary>
    public static TagList Empty() => new(null, []);

    /// <summary>Seeds the list with the initial tags, their descriptions and their implications (L1).</summary>
    public static TagList Seed(IReadOnlyList<InitialTag> initial, Func<TagId> newId, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(initial);
        ArgumentNullException.ThrowIfNull(newId);
        var ids = initial.ToDictionary(t => t.Name, _ => newId());
        var list = new TagList(now, initial.Select(t => Tag.New(ids[t.Name], t.Name, t.Description, t.Implies is { } implied ? ids[implied] : null)));
        list.Raise(new TagListSeeded(list.Id, now));
        return list;
    }

    /// <summary>Restores the list loaded from storage, without raising any event.</summary>
    public static TagList Rehydrate(DateTimeOffset? seededAt, IEnumerable<Tag> tags) => new(seededAt, tags);

    public Result<Tag> Add(TagId id, TagName name, TagDescription description, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(description);
        if (IsNameTaken(name, except: null)) return CatalogErrors.TagNameTaken;

        var tag = Tag.New(id, name, description, impliedTag: null);
        _tags.Add(tag);
        Raise(new TagAdded(id, name, now));
        return Result<Tag>.Success(tag);
    }

    /// <summary>The same rules as when adding, the tag itself aside for the uniqueness (L8).</summary>
    public Result<Tag> Rename(TagId id, TagName name, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(name);
        if (InTheList(id) is not { } tag) return CatalogErrors.TagNotFound;
        if (IsNameTaken(name, except: id)) return CatalogErrors.TagNameTaken;

        tag.Rename(name);
        Raise(new TagRenamed(id, name, now));
        return Result<Tag>.Success(tag);
    }

    public Result<Tag> Describe(TagId id, TagDescription description, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(description);
        if (InTheList(id) is not { } tag) return CatalogErrors.TagNotFound;

        tag.Describe(description);
        Raise(new TagDescribed(id, now));
        return Result<Tag>.Success(tag);
    }

    /// <summary>
    /// Takes the tag out of the list, unless a tag of the list implies it (« dynamique » while « pop » is there). Its name
    /// becomes free again; the tag stays known for the history (ADR 0032).
    /// </summary>
    public Result<Tag> Remove(TagId id, DateTimeOffset now)
    {
        if (InTheList(id) is not { } tag) return CatalogErrors.TagNotFound;
        if (ImpliersOf(id).Count > 0) return CatalogErrors.TagImplied;

        tag.Remove(now);
        Raise(new TagRemoved(id, now));
        return Result<Tag>.Success(tag);
    }

    /// <summary>The tags of the list that imply this one, in catalog order.</summary>
    public IReadOnlyList<Tag> ImpliersOf(TagId id) => [.. Tags.Where(t => t.ImpliedTag == id)];

    private Tag? InTheList(TagId id) => _tags.SingleOrDefault(t => t.Id == id && t.IsInTheList);

    private bool IsNameTaken(TagName name, TagId? except) =>
        _tags.Any(t => t.IsInTheList && t.Id != except && t.Name.Key == name.Key);
}

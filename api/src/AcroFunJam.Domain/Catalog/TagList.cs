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

    /// <summary>The revision of the initial list the list is at (ADR 0035); none for a list started empty.</summary>
    public int? SeedRevision { get; private set; }

    /// <summary>The tags of the list, in catalog order (Q130).</summary>
    public IReadOnlyList<Tag> Tags => [.. _tags.Where(t => t.IsInTheList).OrderBy(t => t.Name, TagName.CatalogOrder)];

    /// <summary>Every tag ever in the list, removed ones included (history, storage).</summary>
    public IReadOnlyList<Tag> AllTags => _tags;

    private TagList(DateTimeOffset? seededAt, int? seedRevision, IEnumerable<Tag> tags) : base(TagListId.Catalog)
    {
        SeededAt = seededAt;
        SeedRevision = seedRevision;
        _tags = [.. tags];
    }

    /// <summary>A list without tag, started by a management use case when none has been seeded (the scenarios).</summary>
    public static TagList Empty() => new(null, null, []);

    /// <summary>Seeds the list with the initial tags of a revision, their descriptions, implications and scopes (L1, ADR 0035).</summary>
    public static TagList Seed(InitialTagListRevision revision, Func<TagId> newId, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(revision);
        ArgumentNullException.ThrowIfNull(newId);
        var initial = revision.Tags;
        var ids = initial.ToDictionary(t => t.Name, _ => newId());
        var list = new TagList(now, revision.Number, initial.Select(t =>
            Tag.New(ids[t.Name], t.Name, t.Description, t.Implies is { } implied ? ids[implied] : null, t.Scope)));
        list.Raise(new TagListSeeded(list.Id, now));
        return list;
    }

    /// <summary>Restores the list loaded from storage, without raising any event.</summary>
    public static TagList Rehydrate(DateTimeOffset? seededAt, int? seedRevision, IEnumerable<Tag> tags) => new(seededAt, seedRevision, tags);

    /// <summary>
    /// Brings a list seeded at an older revision up to this one (ADR 0035), revision after revision: an initial tag found by
    /// the key of its name takes the new scope if it kept the previous one, and the new description if it kept the previous
    /// one; nothing else changes. A list never seeded, or already at the revision, is left as it is.
    /// </summary>
    /// <returns>Whether the list has been brought up to date.</returns>
    public bool Upgrade(InitialTagListRevision target, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(target);
        if (SeedRevision is not { } current || current >= target.Number) return false;

        foreach (var (previous, next) in InitialTagList.Revisions.Zip(InitialTagList.Revisions.Skip(1)))
        {
            if (previous.Number < current || next.Number > target.Number) continue;
            foreach (var initial in next.Tags)
            {
                var before = previous.Tags.SingleOrDefault(t => t.Name.Key == initial.Name.Key);
                var tag = Tags.SingleOrDefault(t => t.Name.Key == initial.Name.Key);
                if (before is null || tag is null) continue;
                if (tag.Scope == before.Scope) tag.ApplyTo(initial.Scope);
                if (tag.Description == before.Description) tag.Describe(initial.Description);
            }
        }

        SeedRevision = target.Number;
        Raise(new TagListUpgraded(Id, target.Number, now));
        return true;
    }

    public Result<Tag> Add(TagId id, TagName name, TagDescription description, TagScope scope, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(description);
        if (IsNameTaken(name, except: null)) return CatalogErrors.TagNameTaken;

        var tag = Tag.New(id, name, description, impliedTag: null, scope);
        _tags.Add(tag);
        Raise(new TagAdded(id, name, scope, now));
        return Result<Tag>.Success(tag);
    }

    /// <summary>
    /// Changes what the tag applies to (story 9a, A4, A5): refused when it would apply where the tag it implies does not, when
    /// a tag implying it applies where it would stop applying, or when elements of a withdrawn target carry it (read under the
    /// lock).
    /// </summary>
    public Result<Tag> ChangeScope(TagId id, TagScope scope, TagCarriers carriers, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(carriers);
        if (InTheList(id) is not { } tag) return CatalogErrors.TagNotFound;
        if (tag.Scope == scope) return Result<Tag>.Success(tag);
        if (tag.ImpliedTag is { } impliedId && InTheList(impliedId) is { } implied && !implied.Scope.Covers(scope))
            return CatalogErrors.TagScopeExceedsImplied;
        var impliers = ImpliersOf(id).Where(t => !scope.Covers(t.Scope)).ToList();
        if (impliers.Count > 0) return new TagScopeNeededByImpliersError(impliers);
        var carried = carriers.On(tag.Scope.WithdrawnBy(scope));
        if (!carried.IsEmpty) return new TagCarriedError(carried);

        tag.ApplyTo(scope);
        Raise(new TagScopeChanged(id, scope, now));
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
    /// <remarks>Then, unless something carries it (ADR 0033): the published transitions and the pending proposals, read under the lock.</remarks>
    public Result<Tag> Remove(TagId id, DateTimeOffset now, TagCarriers? carriers = null)
    {
        if (InTheList(id) is not { } tag) return CatalogErrors.TagNotFound;
        if (ImpliersOf(id).Count > 0) return CatalogErrors.TagImplied;
        if (carriers is { IsEmpty: false }) return new TagCarriedError(carriers);

        tag.Remove(now);
        Raise(new TagRemoved(id, now));
        return Result<Tag>.Success(tag);
    }

    /// <summary>
    /// Chooses tags for an element through the list (ADR 0033, ADR 0035): those in the list that apply to it, completed with
    /// the tags they imply while those are in the list and apply to it; the others are not in the list (unknown or removed),
    /// or do not apply to it. Choosing a completed set again gives the same set.
    /// </summary>
    public TagChoice Choose(IEnumerable<TagId> chosen, TagTarget target)
    {
        ArgumentNullException.ThrowIfNull(chosen);
        var requested = TagSet.Of(chosen);
        var inList = requested.Ids.Select(InTheList).OfType<Tag>().ToList();
        var applicable = inList.Where(t => t.Scope.Includes(target)).ToList();
        var implied = applicable.Select(t => t.ImpliedTag).OfType<TagId>()
            .Where(id => InTheList(id) is { } tag && tag.Scope.Includes(target));
        return new TagChoice(
            TagSet.Of(applicable.Select(t => t.Id).Concat(implied)),
            TagSet.Of(requested.Ids.Where(id => InTheList(id) is null)),
            TagSet.Of(inList.Where(t => !t.Scope.Includes(target)).Select(t => t.Id)));
    }

    /// <summary>The current names of these tags, removed ones included (the history of a decided proposal); unknown ones left out.</summary>
    public IReadOnlyDictionary<TagId, TagName> NamesOf(TagSet tags)
    {
        ArgumentNullException.ThrowIfNull(tags);
        return _tags.Where(t => tags.Contains(t.Id)).ToDictionary(t => t.Id, t => t.Name);
    }

    /// <summary>The tags of the list that imply this one, in catalog order.</summary>
    public IReadOnlyList<Tag> ImpliersOf(TagId id) => [.. Tags.Where(t => t.ImpliedTag == id)];

    private Tag? InTheList(TagId id) => _tags.SingleOrDefault(t => t.Id == id && t.IsInTheList);

    private bool IsNameTaken(TagName name, TagId? except) =>
        _tags.Any(t => t.IsInTheList && t.Id != except && t.Name.Key == name.Key);
}

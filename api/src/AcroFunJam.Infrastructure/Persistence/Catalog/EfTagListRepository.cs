using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>
/// EF Core adapter of <see cref="ITagListRepository"/> (ADR 0032): the list row and one row per tag. An update inserts the
/// tags read nowhere and updates the others (a short list, rarely changed).
/// </summary>
public sealed class EfTagListRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : ITagListRepository
{
    private readonly HashSet<TagId> _stored = [];

    public async Task<TagList?> Get(CancellationToken ct)
    {
        var list = await context.Set<TagListRecord>().AsNoTracking().SingleOrDefaultAsync(l => l.Id == TagListId.Catalog.Value, ct);
        if (list is null) return null;

        var records = await context.Set<TagRecord>().AsNoTracking().ToListAsync(ct);
        var tags = records.Select(ToTag).ToList();
        _stored.UnionWith(tags.Select(t => t.Id));
        var tagList = TagList.Rehydrate(list.SeededAt, list.SeedRevision, tags);
        aggregates.Track(tagList);
        return tagList;
    }

    public void Add(TagList list)
    {
        ArgumentNullException.ThrowIfNull(list);
        context.Set<TagListRecord>().Add(new TagListRecord { Id = list.Id.Value, SeededAt = list.SeededAt, SeedRevision = list.SeedRevision });
        context.Set<TagRecord>().AddRange(list.AllTags.Select(ToRecord));
        aggregates.Track(list);
    }

    public void Update(TagList list)
    {
        ArgumentNullException.ThrowIfNull(list);
        var listEntry = context.Set<TagListRecord>().Attach(new TagListRecord { Id = list.Id.Value, SeededAt = list.SeededAt, SeedRevision = list.SeedRevision });
        listEntry.Property(l => l.SeedRevision).IsModified = true;
        foreach (var tag in list.AllTags)
        {
            if (!_stored.Contains(tag.Id))
            {
                context.Set<TagRecord>().Add(ToRecord(tag));
                continue;
            }

            var entry = context.Set<TagRecord>().Attach(ToRecord(tag));
            entry.Property(t => t.Name).IsModified = true;
            entry.Property(t => t.NameKey).IsModified = true;
            entry.Property(t => t.Description).IsModified = true;
            entry.Property(t => t.Scope).IsModified = true;
            entry.Property(t => t.RemovedAt).IsModified = true;
        }

        aggregates.Track(list);
    }

    private static TagRecord ToRecord(Tag tag) => new()
    {
        Id = tag.Id.Value,
        Name = tag.Name.Value,
        NameKey = tag.Name.Key.Value,
        Description = tag.Description.Value,
        ImpliedTagId = tag.ImpliedTag?.Value,
        Scope = tag.Scope.ToCode(),
        RemovedAt = tag.RemovedAt,
    };

    // Stored data always met the rules when written: breaking them now is a bug.
    private static Tag ToTag(TagRecord record) =>
        Tag.Rehydrate(
            new TagId(record.Id),
            TagName.Create(record.Name).Value ?? throw Invalid(record, "name"),
            TagDescription.Create(record.Description).Value ?? throw Invalid(record, "description"),
            record.ImpliedTagId is { } implied ? new TagId(implied) : null,
            TagScopeCodes.FromCode(record.Scope) is { IsSuccess: true } scope ? scope.Value : throw Invalid(record, "scope"),
            record.RemovedAt);

    private static InvalidOperationException Invalid(TagRecord record, string what) => new($"Invalid stored {what} of the tag {record.Id}.");
}

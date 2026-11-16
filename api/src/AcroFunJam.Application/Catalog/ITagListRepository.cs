using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the list of tags of the catalog, a single aggregate (saved by <see cref="Common.IUnitOfWork"/>, ADR 0032).</summary>
public interface ITagListRepository
{
    /// <summary>The list, removed tags included; none before it is seeded or started.</summary>
    Task<TagList?> Get(CancellationToken ct);

    void Add(TagList list);

    /// <summary>Saves the changed list: its new tags and the changes of the others.</summary>
    void Update(TagList list);
}

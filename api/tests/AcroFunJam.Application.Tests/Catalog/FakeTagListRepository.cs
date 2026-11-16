using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>In-memory fake of <see cref="ITagListRepository"/>: the stored list, if any, and how it was saved.</summary>
internal sealed class FakeTagListRepository : ITagListRepository
{
    public TagList? Stored { get; set; }

    public int Adds { get; private set; }

    public int Updates { get; private set; }

    public Task<TagList?> Get(CancellationToken ct) => Task.FromResult(Stored);

    public void Add(TagList list)
    {
        Stored = list;
        Adds++;
    }

    public void Update(TagList list)
    {
        Stored = list;
        Updates++;
    }
}

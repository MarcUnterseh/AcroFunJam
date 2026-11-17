using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetTagNames;

internal sealed class GetTagNamesHandler(ITagListRepository lists) : IQueryHandler<GetTagNames, IReadOnlyList<NamedTag>>
{
    public async Task<Result<IReadOnlyList<NamedTag>>> Handle(GetTagNames query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var names = (await lists.Get(ct))?.NamesOf(query.Tags) ?? new Dictionary<TagId, TagName>();
        IReadOnlyList<NamedTag> named = [.. names.Select(n => new NamedTag(n.Key, n.Value)).OrderBy(t => t.Name, TagName.CatalogOrder)];
        return Result<IReadOnlyList<NamedTag>>.Success(named);
    }
}

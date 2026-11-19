using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ListTags;

internal sealed class ListTagsHandler(ITagListRepository lists, ITagCarriersReader carriers) : IQueryHandler<ListTags, IReadOnlyList<TagDto>>
{
    public async Task<Result<IReadOnlyList<TagDto>>> Handle(ListTags query, CancellationToken ct)
    {
        var list = await lists.Get(ct);
        var counts = await carriers.PublishedTransitionCounts(ct);
        var poseCounts = await carriers.PublishedPoseCounts(ct);
        IReadOnlyList<TagDto> tags = list is null
            ? []
            : [.. list.Tags.Select(t => TagDto.From(t, counts.GetValueOrDefault(t.Id), poseCounts.GetValueOrDefault(t.Id)))];
        return Result<IReadOnlyList<TagDto>>.Success(tags);
    }
}

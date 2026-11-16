using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ListTags;

internal sealed class ListTagsHandler(ITagListRepository lists) : IQueryHandler<ListTags, IReadOnlyList<TagDto>>
{
    public async Task<Result<IReadOnlyList<TagDto>>> Handle(ListTags query, CancellationToken ct)
    {
        var list = await lists.Get(ct);
        IReadOnlyList<TagDto> tags = list is null ? [] : [.. list.Tags.Select(t => TagDto.From(t, transitionCount: 0))];
        return Result<IReadOnlyList<TagDto>>.Success(tags);
    }
}

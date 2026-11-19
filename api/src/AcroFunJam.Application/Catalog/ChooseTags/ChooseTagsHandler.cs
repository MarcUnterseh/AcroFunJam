using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ChooseTags;

internal sealed class ChooseTagsHandler(ITagListRepository lists) : IQueryHandler<ChooseTags, TagChoice>
{
    public async Task<Result<TagChoice>> Handle(ChooseTags query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        return Result<TagChoice>.Success((await lists.Get(ct) ?? TagList.Empty()).Choose(query.Tags, query.Target));
    }
}

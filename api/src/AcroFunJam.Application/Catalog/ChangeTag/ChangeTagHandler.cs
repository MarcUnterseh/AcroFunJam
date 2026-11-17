using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ChangeTag;

internal sealed class ChangeTagHandler(ITagListRepository lists, ITagCarriersReader carriers, IUnitOfWork unitOfWork, TimeProvider clock) : ICommandHandler<ChangeTag, TagDto>
{
    public async Task<Result<TagDto>> Handle(ChangeTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (await lists.Get(ct) is not { } list) return CatalogErrors.TagNotFound;
        if (list.Tags.SingleOrDefault(t => t.Id == command.Id) is not { } tag) return CatalogErrors.TagNotFound;

        var now = clock.GetUtcNow();
        if (tag.Name != command.Name && list.Rename(command.Id, command.Name, now) is { IsFailure: true } renamed) return renamed.Error!;
        if (tag.Description != command.Description) list.Describe(command.Id, command.Description, now);

        lists.Update(list);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        var counts = await carriers.PublishedTransitionCounts(ct);
        return Result<TagDto>.Success(TagDto.From(tag, counts.GetValueOrDefault(tag.Id)));
    }
}

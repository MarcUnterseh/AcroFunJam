using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.AddTag;

internal sealed class AddTagHandler(ITagListRepository lists, IUnitOfWork unitOfWork, TimeProvider clock) : ICommandHandler<AddTag, TagDto>
{
    public async Task<Result<TagDto>> Handle(AddTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // Without a seeded list (the scenarios, never in production), the list starts empty (ADR 0032).
        var stored = await lists.Get(ct);
        var list = stored ?? TagList.Empty();

        var tag = list.Add(new TagId(Guid.CreateVersion7()), command.Name, command.Description, command.Scope, clock.GetUtcNow());
        if (tag.IsFailure) return tag.Error!;

        if (stored is null) lists.Add(list);
        else lists.Update(list);
        // A concurrent add of the same name is refused by the unique index of the names (ADR 0032).
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<TagDto>.Success(TagDto.From(tag.Value!, transitionCount: 0));
    }
}

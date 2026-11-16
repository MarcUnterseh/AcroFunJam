using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RemoveTag;

internal sealed class RemoveTagHandler(ITagListRepository lists, IUnitOfWork unitOfWork, TimeProvider clock) : ICommandHandler<RemoveTag, bool>
{
    public async Task<Result<bool>> Handle(RemoveTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        if (await lists.Get(ct) is not { } list) return CatalogErrors.TagNotFound;

        var removed = list.Remove(command.Id, clock.GetUtcNow());
        if (removed.IsFailure) return removed.Error!;

        lists.Update(list);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<bool>.Success(true);
    }
}

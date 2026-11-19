using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RemoveTag;

internal sealed class RemoveTagHandler(
    ITagListRepository lists,
    ITagCarriersReader transitions,
    IPendingTagCarriers proposals,
    IPoseRepository poses,
    ITagListLock tagListLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<RemoveTag, bool>
{
    public Task<Result<bool>> Handle(RemoveTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // Exclusive lock: no tag is set meanwhile (a proposal, an acceptance, a direct tagging), so the carriers read stay true (ADR 0033).
        return tagListLock.Exclusive(async lockedCt =>
        {
            if (await lists.Get(lockedCt) is not { } list) return CatalogErrors.TagNotFound;

            var carriers = await new TagCarriersLookup(transitions, proposals, poses).Of(command.Id, lockedCt);
            var removed = list.Remove(command.Id, clock.GetUtcNow(), carriers);
            if (removed.IsFailure) return removed.Error!;

            lists.Update(list);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<bool>.Success(true);
        }, ct);
    }
}

using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.ChangeTag;

internal sealed class ChangeTagHandler(
    ITagListRepository lists,
    ITagCarriersReader transitions,
    IPendingTagCarriers proposals,
    IPoseRepository poses,
    ITagListLock tagListLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<ChangeTag, TagDto>
{
    public Task<Result<TagDto>> Handle(ChangeTag command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // Exclusive lock (ADR 0035): no tag is set meanwhile, so that the carriers read stay true when the scope narrows.
        return tagListLock.Exclusive(async lockedCt =>
        {
            if (await lists.Get(lockedCt) is not { } list) return CatalogErrors.TagNotFound;
            if (list.Tags.SingleOrDefault(t => t.Id == command.Id) is not { } tag) return CatalogErrors.TagNotFound;

            var now = clock.GetUtcNow();
            if (tag.Name != command.Name && list.Rename(command.Id, command.Name, now) is { IsFailure: true } renamed) return renamed.Error!;
            if (tag.Description != command.Description) list.Describe(command.Id, command.Description, now);
            if (tag.Scope != command.Scope)
            {
                var carriers = await new TagCarriersLookup(transitions, proposals, poses).Of(command.Id, lockedCt);
                if (list.ChangeScope(command.Id, command.Scope, carriers, now) is { IsFailure: true } narrowed) return narrowed.Error!;
            }

            lists.Update(list);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            var counts = await transitions.PublishedTransitionCounts(lockedCt);
            return Result<TagDto>.Success(TagDto.From(tag, counts.GetValueOrDefault(tag.Id)));
        }, ct);
    }
}

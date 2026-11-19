using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.TagTransition;

internal sealed class TagTransitionHandler(
    ITransitionRepository transitions, ITagListRepository tagLists, ITagListLock tagListLock, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<TagTransition, TagSet>
{
    /// <returns>The tags of the transition, completed through the list.</returns>
    public Task<Result<TagSet>> Handle(TagTransition command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // Shared lock: no tag of the choice is removed meanwhile (ADR 0033).
        return tagListLock.Shared(async lockedCt =>
        {
            if (await transitions.GetById(command.Transition, lockedCt) is not { } transition) return CatalogErrors.TransitionNotFound;

            var choice = (await tagLists.Get(lockedCt) ?? TagList.Empty()).Choose(command.Tags, TagTarget.Transition);
            var tagged = transition.Tag(choice, clock.GetUtcNow());
            if (tagged.IsFailure) return tagged.Error!;

            transitions.Update(transition);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return tagged;
        }, ct);
    }
}

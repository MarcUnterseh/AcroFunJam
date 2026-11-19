using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.TagPose;

internal sealed class TagPoseHandler(
    IPoseRepository poses,
    ITagListRepository tagLists,
    IPendingPoseRevisions revisions,
    IPoseTaggingLock poseLock,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<TagPose, TagSet>
{
    /// <returns>The tags of the pose, completed through the list.</returns>
    public Task<Result<TagSet>> Handle(TagPose command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        return poseLock.Run(command.Pose, async lockedCt =>
        {
            if (await poses.GetById(command.Pose, lockedCt) is not { } pose) return CatalogErrors.PoseNotFound;

            var choice = (await tagLists.Get(lockedCt) ?? TagList.Empty()).Choose(command.Tags, TagTarget.Pose);
            var version = pose.Version;
            var tagged = pose.Tag(choice, await revisions.IsPending(pose.Id, lockedCt), clock.GetUtcNow());
            if (tagged.IsFailure) return tagged.Error!;
            // The same set changes nothing, not even the version: nothing to save.
            if (pose.Version == version) return tagged;

            poses.Update(pose);
            var saved = await unitOfWork.SaveChanges(lockedCt);
            if (saved.IsFailure) return saved.Error!;
            return tagged;
        }, ct);
    }
}

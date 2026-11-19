using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.PublishPose;

internal sealed class PublishPoseHandler(IPoseRepository poses, IUnitOfWork unitOfWork, TimeProvider clock, ITagListRepository tagLists)
    : ICommandHandler<PublishPose, PoseId>
{
    public async Task<Result<PoseId>> Handle(PublishPose command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var nameAlreadyPublished = await poses.IsNameTaken(command.Name.Key, ct);
        // The tags are chosen again by the list (ADR 0036): a tag removed or narrowed meanwhile is refused.
        var tags = command.Tags.Count == 0 ? null : (await tagLists.Get(ct) ?? TagList.Empty()).Choose(command.Tags.Ids, TagTarget.Pose);
        var published = Pose.Publish(
            new PoseId(Guid.CreateVersion7()), command.Name, command.Difficulty, command.Flow, command.Source, nameAlreadyPublished, clock.GetUtcNow(),
            tags);
        if (published.IsFailure) return published.Error!;

        poses.Add(published.Value!);
        // Outside a name reservation, a concurrent publication of the same name is refused by the unique index (ADR 0017).
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<PoseId>.Success(published.Value!.Id);
    }
}

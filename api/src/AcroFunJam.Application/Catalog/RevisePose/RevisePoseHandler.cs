using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.RevisePose;

internal sealed class RevisePoseHandler(IPoseRepository poses, IUnitOfWork unitOfWork, TimeProvider clock, ITagListRepository tagLists)
    : ICommandHandler<RevisePose, PoseVersion>
{
    public async Task<Result<PoseVersion>> Handle(RevisePose command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var pose = await poses.GetById(command.Pose, ct);
        if (pose is null) return CatalogErrors.PoseNotFound;

        // The pose keeps its own name key: only another pose can take the new name (ADR 0017).
        var nameTaken = command.Name.Key != pose.Name.Key && await poses.IsNameTaken(command.Name.Key, ct);
        // The tags are chosen again by the list (ADR 0036): a tag removed or narrowed meanwhile is refused.
        var tags = command.Tags is null ? null : (await tagLists.Get(ct) ?? TagList.Empty()).Choose(command.Tags.Ids, TagTarget.Pose);
        var revised = pose.Revise(command.Name, command.Difficulty, command.Flow, command.Expected, nameTaken, command.Source, clock.GetUtcNow(), tags);
        if (revised.IsFailure) return revised.Error!;

        poses.Update(pose);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return revised;
    }
}

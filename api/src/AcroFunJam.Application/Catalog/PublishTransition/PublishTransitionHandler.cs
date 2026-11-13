using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.PublishTransition;

internal sealed class PublishTransitionHandler(IPoseRepository poses, ITransitionRepository transitions, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<PublishTransition, TransitionId>
{
    public async Task<Result<TransitionId>> Handle(PublishTransition command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        // The Catalog stays master: it checks the poses and the place again (ADR 0028, ADR 0029).
        var published = await poses.NamesOf([command.FromPose, command.ToPose], ct);
        var slotTaken = await transitions.IsSlotTaken(command.FromPose, command.ToPose, command.Name?.Key, ct);
        var transition = Transition.Publish(
            new TransitionId(Guid.CreateVersion7()), command.FromPose, command.ToPose, command.Name, command.Difficulty, command.Description,
            command.Source, published.ContainsKey(command.FromPose), published.ContainsKey(command.ToPose), slotTaken, clock.GetUtcNow());
        if (transition.IsFailure) return transition.Error!;

        transitions.Add(transition.Value!);
        // Outside a reservation, a concurrent publication taking the same place is refused by the unique indexes (ADR 0029).
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<TransitionId>.Success(transition.Value!.Id);
    }
}

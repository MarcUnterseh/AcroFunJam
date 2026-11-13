using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>In-memory fake of <see cref="ITransitionRepository"/>: the places taken by published transitions.</summary>
internal sealed class FakeTransitionRepository : ITransitionRepository
{
    public List<Transition> Added { get; } = [];

    public void Add(Transition transition) => Added.Add(transition);

    public Task<bool> IsSlotTaken(PoseId from, PoseId to, TransitionNameKey? nameKey, CancellationToken ct) =>
        Task.FromResult(Added.Any(t => t.FromPose == from && t.ToPose == to && t.Name?.Key == nameKey));
}

/// <summary>In-memory fake of <see cref="IPoseTransitionsReader"/>: the transitions from and to each pose, in any order.</summary>
internal sealed class FakePoseTransitionsReader : IPoseTransitionsReader
{
    public Dictionary<PoseId, List<LinkedTransition>> From { get; } = [];

    public Dictionary<PoseId, List<LinkedTransition>> To { get; } = [];

    public Task<IReadOnlyList<LinkedTransition>> TransitionsFrom(PoseId pose, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<LinkedTransition>>(From.GetValueOrDefault(pose) ?? []);

    public Task<IReadOnlyList<LinkedTransition>> TransitionsTo(PoseId pose, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<LinkedTransition>>(To.GetValueOrDefault(pose) ?? []);
}

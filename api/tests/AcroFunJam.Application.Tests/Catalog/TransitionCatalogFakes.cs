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

    public List<Transition> Updated { get; } = [];

    public Task<Transition?> GetById(TransitionId id, CancellationToken ct) => Task.FromResult(Added.SingleOrDefault(t => t.Id == id));

    public void Update(Transition transition) => Updated.Add(transition);

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

/// <summary>In-memory fake of <see cref="ITagCarriersReader"/>: how many published transitions carry each tag.</summary>
internal sealed class FakeTagCarriersReader : ITagCarriersReader
{
    public Dictionary<TagId, int> Counts { get; } = [];

    public Task<IReadOnlyDictionary<TagId, int>> PublishedTransitionCounts(CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<TagId, int>>(Counts);

    public Dictionary<TagId, List<CarryingTransition>> Carriers { get; } = [];

    public Task<IReadOnlyList<CarryingTransition>> TransitionsCarrying(TagId tag, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<CarryingTransition>>(Carriers.GetValueOrDefault(tag) ?? []);
}

/// <summary>In-memory fake of <see cref="IPendingTagCarriers"/>: the pending proposals carrying each tag.</summary>
internal sealed class FakePendingTagCarriers : IPendingTagCarriers
{
    public Dictionary<TagId, List<PendingTagCarrier>> Carriers { get; } = [];

    public Task<IReadOnlyList<PendingTagCarrier>> ProposalsCarrying(TagId tag, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PendingTagCarrier>>(Carriers.GetValueOrDefault(tag) ?? []);
}

using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A transition carrying a tag, published or proposed (ADR 0033, ADR 0034): its identifier, its poses under their current names and
/// its optional name.
/// </summary>
public sealed record CarryingTransition(
    Guid Id, PoseId FromPose, PoseName FromPoseName, PoseId ToPose, PoseName ToPoseName, TransitionName? Name);

/// <summary>
/// What carries a tag (L10, ADR 0033): the published transitions of the Catalog and the pending proposals of Contribution, each in the
/// order of the catalog (start pose, end pose, then the name, the unnamed one first).
/// </summary>
public sealed record TagCarriers
{
    public static TagCarriers None { get; } = new([], []);

    public IReadOnlyList<CarryingTransition> Transitions { get; }

    public IReadOnlyList<CarryingTransition> PendingProposals { get; }

    public TagCarriers(IEnumerable<CarryingTransition> transitions, IEnumerable<CarryingTransition> pendingProposals)
    {
        ArgumentNullException.ThrowIfNull(transitions);
        ArgumentNullException.ThrowIfNull(pendingProposals);
        Transitions = [.. transitions.Order(CatalogOrder.Instance)];
        PendingProposals = [.. pendingProposals.Order(CatalogOrder.Instance)];
    }

    public bool IsEmpty => Transitions.Count == 0 && PendingProposals.Count == 0;

    private sealed class CatalogOrder : IComparer<CarryingTransition>
    {
        public static CatalogOrder Instance { get; } = new();

        public int Compare(CarryingTransition? x, CarryingTransition? y)
        {
            if (ReferenceEquals(x, y)) return 0;
            if (x is null) return -1;
            if (y is null) return 1;
            var byFrom = PoseName.CatalogOrder.Compare(x.FromPoseName, y.FromPoseName);
            if (byFrom != 0) return byFrom;
            var byTo = PoseName.CatalogOrder.Compare(x.ToPoseName, y.ToPoseName);
            if (byTo != 0) return byTo;
            return (x.Name, y.Name) switch
            {
                (null, null) => 0,
                (null, _) => -1,
                (_, null) => 1,
                var (left, right) => string.CompareOrdinal(left.Key.Value, right.Key.Value),
            };
        }
    }
}

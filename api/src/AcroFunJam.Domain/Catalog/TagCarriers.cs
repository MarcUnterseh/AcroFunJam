using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A transition carrying a tag, published or proposed (ADR 0033, ADR 0034): its identifier, its poses under their current names and
/// its optional name.
/// </summary>
public sealed record CarryingTransition(
    Guid Id, PoseId FromPose, PoseName FromPoseName, PoseId ToPose, PoseName ToPoseName, TransitionName? Name);

/// <summary>A published pose carrying a tag (story 9a, ADR 0036): its identifier and its current name.</summary>
public sealed record CarryingPose(PoseId Id, PoseName Name);

/// <summary>The kind of a pending proposal about a pose (story 9a): a new pose, or a revision of a published pose.</summary>
public enum PendingPoseKind
{
    Proposal,
    Revision,
}

/// <summary>
/// A pending proposal about a pose carrying a tag (story 9a, ADR 0036): its identifier, its kind and the name of the pose (proposed,
/// or current for a revision).
/// </summary>
public sealed record CarryingPendingPose(Guid Id, PendingPoseKind Kind, PoseName Name);

/// <summary>
/// What carries a tag (L10, ADR 0033): the published transitions of the Catalog and the pending proposals of Contribution, each in the
/// order of the catalog (start pose, end pose, then the name, the unnamed one first).
/// </summary>
public sealed record TagCarriers
{
    public static TagCarriers None { get; } = new([], []);

    /// <summary>The pending proposals about a pose carrying the tag (story 9a), in catalog order of their pose names.</summary>
    public IReadOnlyList<CarryingPendingPose> PendingPoses { get; }

    /// <summary>The published poses carrying the tag (story 9a), in catalog order.</summary>
    public IReadOnlyList<CarryingPose> Poses { get; }

    public IReadOnlyList<CarryingTransition> Transitions { get; }

    public IReadOnlyList<CarryingTransition> PendingProposals { get; }

    public TagCarriers(
        IEnumerable<CarryingTransition> transitions,
        IEnumerable<CarryingTransition> pendingProposals,
        IEnumerable<CarryingPose>? poses = null,
        IEnumerable<CarryingPendingPose>? pendingPoses = null)
    {
        ArgumentNullException.ThrowIfNull(transitions);
        ArgumentNullException.ThrowIfNull(pendingProposals);
        Poses = [.. (poses ?? []).OrderBy(p => p.Name, PoseName.CatalogOrder)];
        Transitions = [.. transitions.Order(CatalogOrder.Instance)];
        PendingProposals = [.. pendingProposals.Order(CatalogOrder.Instance)];
        PendingPoses = [.. (pendingPoses ?? []).OrderBy(p => p.Name, PoseName.CatalogOrder)];
    }

    public bool IsEmpty => Poses.Count == 0 && Transitions.Count == 0 && PendingProposals.Count == 0 && PendingPoses.Count == 0;

    /// <summary>
    /// Only what carries the tag as one of these targets (story 9a, A4): the poses and their pending proposals, or the transitions and
    /// theirs.
    /// </summary>
    public TagCarriers On(IReadOnlyCollection<TagTarget> targets)
    {
        ArgumentNullException.ThrowIfNull(targets);
        var transitions = targets.Contains(TagTarget.Transition);
        var poses = targets.Contains(TagTarget.Pose);
        return new TagCarriers(
            transitions ? Transitions : [], transitions ? PendingProposals : [], poses ? Poses : [], poses ? PendingPoses : []);
    }

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

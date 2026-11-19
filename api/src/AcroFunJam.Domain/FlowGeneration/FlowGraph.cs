using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>A pose of the published graph, as the generation sees it (ADR 0037).</summary>
public readonly record struct FlowPoseId(Guid Value);

/// <summary>A transition of the published graph, as the generation sees it (ADR 0037).</summary>
public readonly record struct FlowTransitionId(Guid Value);

/// <summary>A published pose: where a flow may start or end, its difficulty and its (completed) tags.</summary>
public sealed record FlowPose(FlowPoseId Id, FlowBoundaries Boundaries, Difficulty Difficulty, TagSet Tags);

/// <summary>A published transition, from a pose to a pose (the same one for a washing machine).</summary>
public sealed record FlowTransition(FlowTransitionId Id, FlowPoseId From, FlowPoseId To, Difficulty Difficulty, TagSet Tags)
{
    public bool IsWashingMachine => From == To;
}

/// <summary>
/// The published graph of the catalog (poses and transitions) and the list of tags, read in one go (ADR 0037).
/// The order of the poses and of the transitions is kept: the search draws among them at random.
/// </summary>
public sealed class FlowGraph
{
    private readonly Dictionary<FlowPoseId, FlowPose> _poses;
    private readonly Dictionary<FlowTransitionId, FlowTransition> _transitions;
    private readonly ILookup<FlowPoseId, FlowTransition> _transitionsFrom;

    public FlowGraph(IEnumerable<FlowPose> poses, IEnumerable<FlowTransition> transitions, TagSet tagsOfTheList)
    {
        ArgumentNullException.ThrowIfNull(poses);
        ArgumentNullException.ThrowIfNull(transitions);
        ArgumentNullException.ThrowIfNull(tagsOfTheList);
        _poses = poses.ToDictionary(pose => pose.Id);
        Poses = [.. _poses.Values];
        Transitions = [.. transitions.Where(transition => _poses.ContainsKey(transition.From) && _poses.ContainsKey(transition.To))];
        _transitions = Transitions.ToDictionary(transition => transition.Id);
        _transitionsFrom = Transitions.ToLookup(transition => transition.From);
        TagsOfTheList = tagsOfTheList;
    }

    public IReadOnlyList<FlowPose> Poses { get; }

    public IReadOnlyList<FlowTransition> Transitions { get; }

    public TagSet TagsOfTheList { get; }

    public FlowPose Pose(FlowPoseId id) => _poses[id];

    public FlowTransition Transition(FlowTransitionId id) => _transitions[id];

    public IEnumerable<FlowTransition> TransitionsFrom(FlowPoseId pose) => _transitionsFrom[pose];

    /// <summary>The number of transitions of the shortest flow (at least one), or null when there is none up to <paramref name="max"/>.</summary>
    public int? ShortestFlowLength(int max)
    {
        var reached = Poses.Where(pose => pose.Boundaries.CanStartFlow).Select(pose => pose.Id).ToHashSet();
        for (var length = 1; length <= max && reached.Count > 0; length++)
        {
            reached = reached.SelectMany(TransitionsFrom).Select(transition => transition.To).ToHashSet();
            if (reached.Any(pose => _poses[pose].Boundaries.CanEndFlow)) return length;
        }

        return null;
    }

    /// <summary>
    /// The graph the criteria leave: the poses and the transitions within the ceilings and without an excluded tag, and only the
    /// transitions whose step (the transition and its arrival pose) carries a requested tag (K1, K2, K4, K6).
    /// </summary>
    public FlowGraph RestrictedTo(FlowCriteria criteria)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        bool Admits(Difficulty difficulty, TagSet tags) => criteria.Ceiling.Admits(difficulty) && criteria.Tags.Admits(tags);

        var poses = Poses.Where(pose => Admits(pose.Difficulty, pose.Tags)).ToDictionary(pose => pose.Id);
        var transitions = Transitions.Where(transition =>
            Admits(transition.Difficulty, transition.Tags)
            && poses.ContainsKey(transition.From)
            && poses.TryGetValue(transition.To, out var arrival)
            && criteria.Tags.IsSatisfiedBy(transition.Tags, arrival.Tags));
        return new FlowGraph(poses.Values, transitions, TagsOfTheList);
    }
}

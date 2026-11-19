using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.FlowGeneration;

/// <summary>A published graph written by name, for the tests of the generator (poses « débutant / débutant » by default).</summary>
internal sealed class GraphBuilder
{
    private readonly Dictionary<string, FlowPose> _poses = [];
    private readonly Dictionary<string, FlowTransition> _transitions = [];
    private readonly List<TagId> _list = [];

    public static Difficulty Of(DifficultyLevel @base, DifficultyLevel flyer) => Difficulty.Create(@base, flyer).Value!;

    private static readonly Difficulty Beginner = Of(DifficultyLevel.Beginner, DifficultyLevel.Beginner);

    /// <summary>A tag of the list, by name.</summary>
    public TagId Tag(string name)
    {
        var id = new TagId(IdOf("tag:" + name));
        if (!_list.Contains(id)) _list.Add(id);
        return id;
    }

    public GraphBuilder Pose(string name, bool start = false, bool end = false, Difficulty? difficulty = null, params string[] tags)
    {
        _poses[name] = new FlowPose(
            PoseId(name), FlowBoundaries.Create(start, end).Value!, difficulty ?? Beginner, TagSet.Of(tags.Select(Tag)));
        return this;
    }

    public GraphBuilder Transition(string name, string from, string to, Difficulty? difficulty = null, params string[] tags)
    {
        _transitions[name] = new FlowTransition(TransitionId(name), PoseId(from), PoseId(to), difficulty ?? Beginner, TagSet.Of(tags.Select(Tag)));
        return this;
    }

    public FlowGraph Build() => new(_poses.Values, _transitions.Values, TagSet.Of(_list));

    public static FlowPoseId PoseId(string name) => new(IdOf("pose:" + name));

    public static FlowTransitionId TransitionId(string name) =>
        new(IdOf("transition:" + name));

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, Guid> Ids = new();

    /// <summary>The same identifier for the same name, in every graph of the tests.</summary>
    private static Guid IdOf(string key) => Ids.GetOrAdd(key, _ => Guid.NewGuid());

    /// <summary>The transitions of a flow, by name, in order.</summary>
    public IReadOnlyList<string> NamesOf(Flow flow) =>
        [.. flow.Steps.Select(step => _transitions.Single(pair => pair.Value.Id == step.Transition).Key)];
}

/// <summary>A source of randomness that draws the given indexes in turn, then keeps the order of the candidates.</summary>
internal sealed class ScriptedRandomSource(params int[] draws) : IRandomSource
{
    private readonly Queue<int> _draws = new(draws);

    public int NextIndex(int count) => _draws.Count > 0 ? Math.Min(_draws.Dequeue(), count - 1) : count - 1;
}

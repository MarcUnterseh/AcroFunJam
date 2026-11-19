using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>
/// Draws a flow at random in the published graph (story 9, ADR 0037). The graph is first restricted by the criteria; a table tells,
/// for each number of transitions left, the poses from which a flow can still end; a depth-first search then draws, at each step,
/// among the unused transitions that keep an end within reach, and backtracks on a dead end, within an exploration budget.
/// </summary>
public static class FlowGenerator
{
    /// <summary>The number of transitions the search may try before giving up (criteria too restrictive).</summary>
    public const int DefaultBudget = 100_000;

    /// <summary>
    /// Checks, in order: the tags not in the list (K8), a catalog without any flow of 1 to 10 transitions (G11), then searches;
    /// no flow under the criteria is « criteria too restrictive ».
    /// </summary>
    public static Result<Flow> Generate(FlowGraph graph, FlowCriteria criteria, IRandomSource random, int budget = DefaultBudget)
    {
        ArgumentNullException.ThrowIfNull(graph);
        ArgumentNullException.ThrowIfNull(criteria);
        ArgumentNullException.ThrowIfNull(random);

        var notInList = criteria.Tags.NotInList(graph.TagsOfTheList);
        if (notInList.Count > 0) return new TagsNotInListError(notInList);
        if (graph.ShortestFlowLength(FlowLength.Max) is null) return FlowGenerationErrors.CatalogInsufficient;

        var flow = new Search(graph.RestrictedTo(criteria), criteria.Length.Value, random, budget).Run();
        return flow is null ? FlowGenerationErrors.CriteriaTooRestrictive : Result<Flow>.Success(flow);
    }

    private sealed class Search
    {
        private readonly FlowGraph _graph;
        private readonly int _length;
        private readonly IRandomSource _random;
        private readonly HashSet<FlowPoseId>[] _canEndIn;
        private readonly HashSet<FlowTransitionId> _used = [];
        private readonly Stack<FlowTransition> _path = new();
        private int _budget;

        public Search(FlowGraph graph, int length, IRandomSource random, int budget)
        {
            _graph = graph;
            _length = length;
            _random = random;
            _budget = budget;
            _canEndIn = CanEndIn(graph, length);
        }

        public Flow? Run()
        {
            foreach (var start in Shuffled(_graph.Poses.Where(pose => pose.Boundaries.CanStartFlow && _canEndIn[_length].Contains(pose.Id))))
            {
                if (Explore(start.Id, _length)) return FlowFrom(start.Id);
                if (_budget <= 0) return null;
            }

            return null;
        }

        /// <summary>For each number r of transitions left, the poses from which r transitions can lead to an end pose (repetitions ignored).</summary>
        private static HashSet<FlowPoseId>[] CanEndIn(FlowGraph graph, int length)
        {
            var table = new HashSet<FlowPoseId>[length + 1];
            table[0] = graph.Poses.Where(pose => pose.Boundaries.CanEndFlow).Select(pose => pose.Id).ToHashSet();
            for (var left = 1; left <= length; left++)
            {
                var next = table[left - 1];
                table[left] = graph.Transitions.Where(transition => next.Contains(transition.To)).Select(transition => transition.From).ToHashSet();
            }

            return table;
        }

        private bool Explore(FlowPoseId pose, int left)
        {
            if (left == 0) return true;
            var candidates = _graph.TransitionsFrom(pose)
                .Where(transition => !_used.Contains(transition.Id) && _canEndIn[left - 1].Contains(transition.To));
            foreach (var transition in Shuffled(candidates))
            {
                if (_budget-- <= 0) return false;
                _used.Add(transition.Id);
                _path.Push(transition);
                if (Explore(transition.To, left - 1)) return true;
                _path.Pop();
                _used.Remove(transition.Id);
            }

            return false;
        }

        /// <summary>Fisher–Yates: from the last candidate to the second, swaps it with one drawn among those before it and itself.</summary>
        private List<T> Shuffled<T>(IEnumerable<T> items)
        {
            var list = items.ToList();
            for (var i = list.Count - 1; i > 0; i--)
            {
                var j = _random.NextIndex(i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }

            return list;
        }

        private Flow FlowFrom(FlowPoseId start) =>
            new(start, [.. _path.Reverse().Select((transition, index) => new FlowStep(index + 1, transition.Id, transition.From, transition.To))]);
    }
}

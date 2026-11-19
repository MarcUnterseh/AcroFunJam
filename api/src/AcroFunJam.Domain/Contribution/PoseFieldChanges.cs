using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>The fields that differ between the values of a pose before a revision and other values (proposed or retained).</summary>
internal static class PoseFieldChanges
{
    /// <summary>In the order of the form, compared once normalised: a change of case of the name is one (ordinal comparison).</summary>
    public static IReadOnlyList<PoseFieldChange> Between(PriorPose before, PoseName name, Difficulty difficulty, FlowBoundaries flow, TagSet tags) =>
    [
        .. Change(before.Name, name, (b, a) => new NameChange(b, a)),
        .. Change(before.Difficulty.Base, difficulty.Base, (b, a) => new BaseDifficultyChange(b, a)),
        .. Change(before.Difficulty.Flyer, difficulty.Flyer, (b, a) => new FlyerDifficultyChange(b, a)),
        .. Change(before.Flow.CanStartFlow, flow.CanStartFlow, (b, a) => new CanStartFlowChange(b, a)),
        .. Change(before.Flow.CanEndFlow, flow.CanEndFlow, (b, a) => new CanEndFlowChange(b, a)),
        .. Change(before.Tags, tags, (b, a) => new PoseTagsChange(b, a)),
    ];

    private static IEnumerable<PoseFieldChange> Change<T>(T before, T after, Func<T, T, PoseFieldChange> changed) =>
        EqualityComparer<T>.Default.Equals(before, after) ? [] : [changed(before, after)];
}

using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The values of a published pose when a revision of it is proposed (story 6, ADR 0026): kept as they were, so that the
/// contributor sees « avant → proposé » even once the pose has changed.
/// </summary>
public sealed record PriorPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow)
{
    /// <summary>The tags of the pose (story 9a, ADR 0036); none for a pose read without.</summary>
    public TagSet Tags { get; init; } = TagSet.Empty;

    /// <summary>Whether these values are those of the pose: a revision with them changes nothing.</summary>
    public bool SameValuesAs(PoseName name, Difficulty difficulty, FlowBoundaries flow, TagSet tags) =>
        name == Name && difficulty == Difficulty && flow == Flow && tags == Tags;
}

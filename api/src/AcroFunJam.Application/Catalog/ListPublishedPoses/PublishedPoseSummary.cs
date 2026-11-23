using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ListPublishedPoses;

/// <summary>Read model of a published pose, with its tags by identifier (story 9a).</summary>
public sealed record PublishedPoseSummary(
    PoseId Id,
    PoseName Name,
    DifficultyLevel BaseDifficulty,
    DifficultyLevel FlyerDifficulty,
    FlowBoundaries Flow)
{
    public TagSet Tags { get; init; } = TagSet.Empty;
}

/// <summary>A published pose as the catalog presents it: with its tags, in catalog order (story 9a, V3).</summary>
public sealed record CatalogPose(PublishedPoseSummary Pose, IReadOnlyList<GetPosePage.PresentedTag> Tags)
{
    /// <summary>The address of the thumbnail of its main photo; none when the pose has no photo (story 10, R16).</summary>
    public string? Thumbnail { get; init; }
}

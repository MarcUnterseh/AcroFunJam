using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.ListPublishedPoses;

/// <summary>Read model of a published pose.</summary>
public sealed record PublishedPoseSummary(
    PoseId Id,
    PoseName Name,
    DifficultyLevel BaseDifficulty,
    DifficultyLevel FlyerDifficulty);

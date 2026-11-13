using AcroFunJam.Api.Endpoints.Common;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>Published poses of the catalog, in catalog order (ADR 0007: lists are wrapped).</summary>
public sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

/// <summary>A published pose; both flow indicators are always given (ADR 0018).</summary>
public sealed record PoseSummaryResponse(
    Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, bool CanStartFlow, bool CanEndFlow);

/// <summary>A published pose with its version, to start a revision of it (story 6, ADR 0024).</summary>
public sealed record PublishedPoseResponse(
    Guid Id,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow,
    int Version,
    IReadOnlyList<LinkedTransitionResponse> TransitionsFrom,
    IReadOnlyList<LinkedTransitionResponse> TransitionsTo);

/// <summary>
/// A published transition on the page of a pose (story 7, ADR 0030): the other pose under its current name (the end pose in
/// <c>transitionsFrom</c>, the start pose in <c>transitionsTo</c>; the same pose for a washing machine).
/// </summary>
public sealed record LinkedTransitionResponse(
    Guid Id, OtherPoseResponse OtherPose, string? Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, string? Description);

/// <summary>The other pose of a transition, under its current name.</summary>
public sealed record OtherPoseResponse(Guid Id, string Name);

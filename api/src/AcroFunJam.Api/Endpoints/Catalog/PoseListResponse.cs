using AcroFunJam.Api.Endpoints.Common;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>Published poses of the catalog, in catalog order (ADR 0007: lists are wrapped).</summary>
public sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

/// <summary>A published pose; both flow indicators are always given (ADR 0018); its tags in catalog order (story 9a, ADR 0036).</summary>
public sealed record PoseSummaryResponse(
    Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, bool CanStartFlow, bool CanEndFlow,
    IReadOnlyList<NamedTagResponse> Tags, string? Thumbnail);

/// <summary>
/// A published pose with its version, to start a revision of it (story 6, ADR 0024); its tags with their descriptions, in
/// catalog order, and whether a revision of it waits for a decision (story 9a, ADR 0036: the fact only, never its content).
/// </summary>
public sealed record PublishedPoseResponse(
    Guid Id,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow,
    int Version,
    IReadOnlyList<LinkedTransitionResponse> TransitionsFrom,
    IReadOnlyList<LinkedTransitionResponse> TransitionsTo,
    IReadOnlyList<TransitionTagResponse> Tags,
    bool PendingRevision,
    IReadOnlyList<PhotoResponse> Photos);

/// <summary>
/// A photo of a pose (story 10, ADR 0039): the main photo is the first of <c>photos</c>; its upright dimensions; the addresses of
/// its generated sizes. The confirmation of the rights is never given.
/// </summary>
public sealed record PhotoResponse(Guid Id, string AltText, string Credit, int Width, int Height, PhotoSourcesResponse Sources);

/// <summary>The addresses of the generated sizes of a photo, under the origin of the API (ADR 0039).</summary>
public sealed record PhotoSourcesResponse(string Thumbnail, string Page, string Enlarged);

/// <summary>
/// A published transition on the page of a pose (story 7, ADR 0030): the other pose under its current name (the end pose in
/// <c>transitionsFrom</c>, the start pose in <c>transitionsTo</c>; the same pose for a washing machine).
/// </summary>
public sealed record LinkedTransitionResponse(
    Guid Id, OtherPoseResponse OtherPose, string? Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, string? Description,
    IReadOnlyList<TransitionTagResponse> Tags);

/// <summary>A tag of a pose or of a transition on the page of a pose, with its description, in catalog order (ADR 0034, ADR 0036).</summary>
public sealed record TransitionTagResponse(Guid Id, string Name, string Description);

/// <summary>The other pose of a transition, under its current name.</summary>
public sealed record OtherPoseResponse(Guid Id, string Name);

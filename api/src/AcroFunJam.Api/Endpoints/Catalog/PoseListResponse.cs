using AcroFunJam.Api.Endpoints.Common;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>Published poses of the catalog, in catalog order (ADR 0007: lists are wrapped).</summary>
public sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

/// <summary>A published pose; both flow indicators are always given (ADR 0018).</summary>
public sealed record PoseSummaryResponse(
    Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, bool CanStartFlow, bool CanEndFlow);

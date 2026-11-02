using System.Text.Json.Serialization;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>Published poses of the catalog, in catalog order (ADR 0007: lists are wrapped).</summary>
public sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

public sealed record PoseSummaryResponse(Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty);

/// <summary>Stable difficulty codes of the HTTP contract; labels are produced by the front (ADR 0007).</summary>
[JsonConverter(typeof(JsonStringEnumConverter<DifficultyCode>))]
public enum DifficultyCode
{
    [JsonStringEnumMemberName("discovery")] Discovery,
    [JsonStringEnumMemberName("beginner")] Beginner,
    [JsonStringEnumMemberName("intermediate")] Intermediate,
    [JsonStringEnumMemberName("advanced")] Advanced,
}

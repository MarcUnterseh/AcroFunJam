using System.Text.Json.Serialization;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Api.Endpoints.Common;

/// <summary>
/// Stable difficulty codes of the HTTP contract, declared as an enum in the OpenAPI document; labels are produced
/// by the front (ADR 0007). Shared by the Catalog and Contribution endpoints, like the shared kernel (ADR 0015).
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<DifficultyCode>))]
public enum DifficultyCode
{
    [JsonStringEnumMemberName("discovery")] Discovery,
    [JsonStringEnumMemberName("beginner")] Beginner,
    [JsonStringEnumMemberName("intermediate")] Intermediate,
    [JsonStringEnumMemberName("advanced")] Advanced,
}

public static class DifficultyCodes
{
    public static DifficultyCode From(DifficultyLevel level) => level switch
    {
        DifficultyLevel.Discovery => DifficultyCode.Discovery,
        DifficultyLevel.Beginner => DifficultyCode.Beginner,
        DifficultyLevel.Intermediate => DifficultyCode.Intermediate,
        DifficultyLevel.Advanced => DifficultyCode.Advanced,
        _ => throw new ArgumentOutOfRangeException(nameof(level), level, "Unknown difficulty level."),
    };
}

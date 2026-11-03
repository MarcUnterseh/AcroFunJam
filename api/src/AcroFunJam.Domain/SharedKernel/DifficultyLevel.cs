using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>Difficulty of a pose or transition for one role, ordered from the most accessible to the most demanding.</summary>
public enum DifficultyLevel
{
    Discovery = 0,
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
}

/// <summary>Stable codes of the difficulty levels (<c>discovery</c>…), shared by the HTTP contract and the storage.</summary>
public static class DifficultyLevelCodes
{
    extension(DifficultyLevel level)
    {
        public static Result<DifficultyLevel> FromCode(string? code) => code switch
        {
            "discovery" => Result<DifficultyLevel>.Success(DifficultyLevel.Discovery),
            "beginner" => Result<DifficultyLevel>.Success(DifficultyLevel.Beginner),
            "intermediate" => Result<DifficultyLevel>.Success(DifficultyLevel.Intermediate),
            "advanced" => Result<DifficultyLevel>.Success(DifficultyLevel.Advanced),
            _ => PoseContentErrors.UnknownDifficultyLevel(code),
        };

        public string ToCode() => level switch
        {
            DifficultyLevel.Discovery => "discovery",
            DifficultyLevel.Beginner => "beginner",
            DifficultyLevel.Intermediate => "intermediate",
            DifficultyLevel.Advanced => "advanced",
            _ => throw new ArgumentOutOfRangeException(nameof(level), level, "Unknown difficulty level."),
        };
    }
}

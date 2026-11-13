using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The optional values of a pose given field by field (adjustments of a validator, changes of a contributor): an absent
/// value (null) is none; a given value follows the content rules of a pose.
/// </summary>
internal static class OptionalPoseValues
{
    public static Result<PoseName?> Name(string? raw)
    {
        if (raw is null) return Result<PoseName?>.Success(null);
        var name = PoseName.Create(raw);
        return name.IsFailure ? name.Error! : Result<PoseName?>.Success(name.Value);
    }

    public static Result<DifficultyLevel?> Level(string? code)
    {
        if (code is null) return Result<DifficultyLevel?>.Success(null);
        var level = DifficultyLevel.FromCode(code);
        return level.IsFailure ? level.Error! : Result<DifficultyLevel?>.Success(level.Value);
    }
}

using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The couple (base difficulty, flyer difficulty) of a pose or a transition; never a single level.</summary>
public sealed record Difficulty
{
    public DifficultyLevel Base { get; }

    public DifficultyLevel Flyer { get; }

    private Difficulty(DifficultyLevel @base, DifficultyLevel flyer)
    {
        Base = @base;
        Flyer = flyer;
    }

    /// <summary>Both levels are required, without default value; the base is checked first.</summary>
    public static Result<Difficulty> Create(DifficultyLevel? @base, DifficultyLevel? flyer)
    {
        if (@base is null) return PoseContentErrors.BaseDifficultyRequired;
        if (flyer is null) return PoseContentErrors.FlyerDifficultyRequired;
        return Result<Difficulty>.Success(new Difficulty(@base.Value, flyer.Value));
    }

    /// <summary>From the stable codes (<c>discovery</c>…): base first, then flyer, each missing or off the scale.</summary>
    public static Result<Difficulty> FromCodes(string? @base, string? flyer)
    {
        var baseLevel = LevelOf(@base, PoseContentErrors.BaseDifficultyRequired);
        if (baseLevel.IsFailure) return baseLevel.Error!;
        var flyerLevel = LevelOf(flyer, PoseContentErrors.FlyerDifficultyRequired);
        if (flyerLevel.IsFailure) return flyerLevel.Error!;
        return Create(baseLevel.Value, flyerLevel.Value);
    }

    private static Result<DifficultyLevel> LevelOf(string? code, Error required) =>
        string.IsNullOrWhiteSpace(code) ? required : DifficultyLevel.FromCode(code);
}

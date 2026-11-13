using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The values a validator corrects before accepting a transition proposal (story 7, R16, ADR 0028): its name, its difficulties
/// and its description, never its poses. The name and the description have three states: kept, replaced or removed.
/// </summary>
public sealed record TransitionAdjustments
{
    public static TransitionAdjustments None { get; } = new();

    /// <summary>Whether the name is adjusted; if so, to <see cref="Name"/> (none: the name is removed).</summary>
    public bool AdjustsName { get; private init; }

    public TransitionName? Name { get; private init; }

    public DifficultyLevel? BaseDifficulty { get; private init; }

    public DifficultyLevel? FlyerDifficulty { get; private init; }

    /// <summary>Whether the description is adjusted; if so, to <see cref="Description"/> (none: the description is removed).</summary>
    public bool AdjustsDescription { get; private init; }

    public TransitionDescription? Description { get; private init; }

    private TransitionAdjustments() { }

    /// <summary>
    /// A missing value is kept; a blank name or description is removed (ADR 0030); any other value follows the content rules
    /// of a transition, checked in the order of the form.
    /// </summary>
    public static Result<TransitionAdjustments> Create(string? name, string? baseDifficulty, string? flyerDifficulty, string? description)
    {
        var adjusted = TransitionName.CreateOptional(name);
        if (adjusted.IsFailure) return adjusted.Error!;
        var baseLevel = LevelOf(baseDifficulty);
        if (baseLevel.IsFailure) return baseLevel.Error!;
        var flyerLevel = LevelOf(flyerDifficulty);
        if (flyerLevel.IsFailure) return flyerLevel.Error!;
        var adjustedDescription = TransitionDescription.CreateOptional(description);
        if (adjustedDescription.IsFailure) return adjustedDescription.Error!;

        return Result<TransitionAdjustments>.Success(new TransitionAdjustments
        {
            AdjustsName = name is not null,
            Name = adjusted.Value,
            BaseDifficulty = baseLevel.Value,
            FlyerDifficulty = flyerLevel.Value,
            AdjustsDescription = description is not null,
            Description = adjustedDescription.Value,
        });
    }

    private static Result<DifficultyLevel?> LevelOf(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return Result<DifficultyLevel?>.Success(null);
        var level = DifficultyLevel.FromCode(code);
        return level.IsFailure ? level.Error! : Result<DifficultyLevel?>.Success(level.Value);
    }
}

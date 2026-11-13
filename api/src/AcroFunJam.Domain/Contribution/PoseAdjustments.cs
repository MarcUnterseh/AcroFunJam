using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The values a validator adjusts before accepting a proposal (story 4, ADR 0022): each one optional, an absent value
/// keeps the proposed one. Applied to the proposed pose, they give the retained pose.
/// </summary>
public sealed record PoseAdjustments
{
    public static PoseAdjustments None { get; } = new();

    public PoseName? Name { get; private init; }

    public DifficultyLevel? BaseDifficulty { get; private init; }

    public DifficultyLevel? FlyerDifficulty { get; private init; }

    public bool? CanStartFlow { get; private init; }

    public bool? CanEndFlow { get; private init; }

    private PoseAdjustments()
    {
    }

    /// <summary>
    /// An adjusted value follows the content rules of a pose (story 3, ADR 0018): an absent value (null) is no adjustment,
    /// "" is a name, hence refused as empty. The name is checked first, then the base and the flyer difficulty.
    /// </summary>
    public static Result<PoseAdjustments> Create(
        string? name, string? baseDifficulty, string? flyerDifficulty, bool? canStartFlow, bool? canEndFlow)
    {
        var poseName = OptionalPoseValues.Name(name);
        if (poseName.IsFailure) return poseName.Error!;
        var baseLevel = OptionalPoseValues.Level(baseDifficulty);
        if (baseLevel.IsFailure) return baseLevel.Error!;
        var flyerLevel = OptionalPoseValues.Level(flyerDifficulty);
        if (flyerLevel.IsFailure) return flyerLevel.Error!;

        return Result<PoseAdjustments>.Success(new PoseAdjustments
        {
            Name = poseName.Value,
            BaseDifficulty = baseLevel.Value,
            FlyerDifficulty = flyerLevel.Value,
            CanStartFlow = canStartFlow,
            CanEndFlow = canEndFlow,
        });
    }
}

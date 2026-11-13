using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The values a contributor changes in a published pose (story 6, ADR 0026): each one optional, an absent value keeps the
/// value of the pose.
/// </summary>
public sealed record PoseChanges
{
    public PoseName? Name { get; private init; }

    public DifficultyLevel? BaseDifficulty { get; private init; }

    public DifficultyLevel? FlyerDifficulty { get; private init; }

    public bool? CanStartFlow { get; private init; }

    public bool? CanEndFlow { get; private init; }

    private PoseChanges()
    {
    }

    /// <summary>
    /// A changed value follows the content rules of a pose (story 3): an absent value (null) is no change, "" is a name,
    /// hence refused as empty. The name is checked first, then the base and the flyer difficulty.
    /// </summary>
    public static Result<PoseChanges> Create(
        string? name, string? baseDifficulty, string? flyerDifficulty, bool? canStartFlow, bool? canEndFlow)
    {
        var poseName = OptionalPoseValues.Name(name);
        if (poseName.IsFailure) return poseName.Error!;

        var baseLevel = OptionalPoseValues.Level(baseDifficulty);
        if (baseLevel.IsFailure) return baseLevel.Error!;
        var flyerLevel = OptionalPoseValues.Level(flyerDifficulty);
        if (flyerLevel.IsFailure) return flyerLevel.Error!;

        return Result<PoseChanges>.Success(new PoseChanges
        {
            Name = poseName.Value,
            BaseDifficulty = baseLevel.Value,
            FlyerDifficulty = flyerLevel.Value,
            CanStartFlow = canStartFlow,
            CanEndFlow = canEndFlow,
        });
    }
}

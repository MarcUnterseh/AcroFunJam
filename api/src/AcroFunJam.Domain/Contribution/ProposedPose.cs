using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Content of a pose proposal, as it will be published if accepted.</summary>
public sealed record ProposedPose
{
    public PoseName Name { get; }

    public Difficulty Difficulty { get; }

    public FlowBoundaries Flow { get; }

    private ProposedPose(PoseName name, Difficulty difficulty, FlowBoundaries flow)
    {
        Name = name;
        Difficulty = difficulty;
        Flow = flow;
    }

    public static Result<ProposedPose> Create(
        string? name, string? baseDifficulty, string? flyerDifficulty, bool? canStartFlow, bool? canEndFlow)
    {
        var poseName = PoseName.Create(name);
        if (poseName.IsFailure) return poseName.Error!;
        var difficulty = Difficulty.FromCodes(baseDifficulty, flyerDifficulty);
        if (difficulty.IsFailure) return difficulty.Error!;
        var flow = FlowBoundaries.Create(canStartFlow, canEndFlow);
        if (flow.IsFailure) return flow.Error!;

        return Result<ProposedPose>.Success(new ProposedPose(poseName.Value!, difficulty.Value!, flow.Value!));
    }

    /// <summary>The pose to publish: each adjusted value replaces the proposed one, the others are kept (ADR 0022).</summary>
    public RetainedPose Retain(PoseAdjustments adjustments)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        return new RetainedPose(
            adjustments.Name ?? Name,
            Difficulty.Create(adjustments.BaseDifficulty ?? Difficulty.Base, adjustments.FlyerDifficulty ?? Difficulty.Flyer).Value!,
            FlowBoundaries.Create(adjustments.CanStartFlow ?? Flow.CanStartFlow, adjustments.CanEndFlow ?? Flow.CanEndFlow).Value!);
    }
}

using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>Content of a pose proposal, as it will be published if accepted.</summary>
public sealed record ProposedPose
{
    public PoseName Name { get; }

    public Difficulty Difficulty { get; }

    public FlowBoundaries Flow { get; }

    /// <summary>Its tags, chosen through the list of the Catalog (story 9a, ADR 0036); none unless chosen.</summary>
    public TagSet Tags { get; private init; } = TagSet.Empty;

    private ProposedPose(PoseName name, Difficulty difficulty, FlowBoundaries flow)
    {
        Name = name;
        Difficulty = difficulty;
        Flow = flow;
    }

    /// <summary>A proposed pose made of values that already follow the content rules (a revised pose, ADR 0026).</summary>
    internal static ProposedPose From(PoseName name, Difficulty difficulty, FlowBoundaries flow) => new(name, difficulty, flow);

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

    /// <summary>The same pose carrying these tags (story 9a).</summary>
    public ProposedPose Tagged(TagSet tags)
    {
        ArgumentNullException.ThrowIfNull(tags);
        return this with { Tags = tags };
    }

    /// <summary>
    /// The pose to publish: each adjusted value replaces the proposed one, the others are kept (ADR 0022); the retained tags,
    /// when given, replace the proposed ones (story 9a).
    /// </summary>
    public RetainedPose Retain(PoseAdjustments adjustments, TagSet? retainedTags = null)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        return new RetainedPose(
            adjustments.Name ?? Name,
            Difficulty.Create(adjustments.BaseDifficulty ?? Difficulty.Base, adjustments.FlyerDifficulty ?? Difficulty.Flyer).Value!,
            FlowBoundaries.Create(adjustments.CanStartFlow ?? Flow.CanStartFlow, adjustments.CanEndFlow ?? Flow.CanEndFlow).Value!)
        {
            Tags = retainedTags ?? Tags,
        };
    }
}

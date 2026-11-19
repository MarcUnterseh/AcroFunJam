using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The pose published when a proposal is accepted (ADR 0022): the proposed pose, with the adjustments of the validator if
/// any. Same shape as <see cref="ProposedPose"/>; the proposal keeps both.
/// </summary>
public sealed record RetainedPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow)
{
    /// <summary>The tags it is published with (story 9a): the proposed ones, or those retained by the validator.</summary>
    public TagSet Tags { get; init; } = TagSet.Empty;

    /// <summary>
    /// A retained pose read back as such (storage): it follows the content rules of a pose, as a proposed pose does
    /// (story 3, ADR 0018), the name checked first, then the difficulty, then the flow boundaries.
    /// </summary>
    public static Result<RetainedPose> Create(
        string? name, string? baseDifficulty, string? flyerDifficulty, bool? canStartFlow, bool? canEndFlow)
    {
        var poseName = PoseName.Create(name);
        if (poseName.IsFailure) return poseName.Error!;
        var difficulty = Difficulty.FromCodes(baseDifficulty, flyerDifficulty);
        if (difficulty.IsFailure) return difficulty.Error!;
        var flow = FlowBoundaries.Create(canStartFlow, canEndFlow);
        if (flow.IsFailure) return flow.Error!;

        return Result<RetainedPose>.Success(new RetainedPose(poseName.Value!, difficulty.Value!, flow.Value!));
    }

    /// <summary>Whether the validator adjusted at least one field of the proposed pose (see <see cref="AdjustmentsFrom"/>).</summary>
    public bool IsAdjustedFrom(ProposedPose proposed) => AdjustmentsFrom(proposed).Count > 0;

    /// <summary>
    /// The fields whose retained value differs from the proposed one, in the order of the form, each with both values (story 5).
    /// Both values are normalised: an adjusted value identical to the proposed one, or differing only by superfluous spaces,
    /// is no adjustment; a change of case of the name is one (ordinal comparison).
    /// </summary>
    public IReadOnlyList<PoseFieldAdjustment> AdjustmentsFrom(ProposedPose proposed)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        return
        [
            .. Adjustment(proposed.Name, Name, (p, r) => new NameAdjustment(p, r)),
            .. Adjustment(proposed.Difficulty.Base, Difficulty.Base, (p, r) => new BaseDifficultyAdjustment(p, r)),
            .. Adjustment(proposed.Difficulty.Flyer, Difficulty.Flyer, (p, r) => new FlyerDifficultyAdjustment(p, r)),
            .. Adjustment(proposed.Flow.CanStartFlow, Flow.CanStartFlow, (p, r) => new CanStartFlowAdjustment(p, r)),
            .. Adjustment(proposed.Flow.CanEndFlow, Flow.CanEndFlow, (p, r) => new CanEndFlowAdjustment(p, r)),
            // Story 9a: a set of tags, the order not counting (TagSet equality).
            .. Adjustment(proposed.Tags, Tags, (p, r) => new PoseTagsAdjustment(p, r)),
        ];
    }

    private static IEnumerable<PoseFieldAdjustment> Adjustment<T>(T proposed, T retained, Func<T, T, PoseFieldAdjustment> adjusted) =>
        EqualityComparer<T>.Default.Equals(proposed, retained) ? [] : [adjusted(proposed, retained)];
}

using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The pose published when a proposal is accepted (ADR 0022): the proposed pose, with the adjustments of the validator if
/// any. Same shape as <see cref="ProposedPose"/>; the proposal keeps both.
/// </summary>
public sealed record RetainedPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow)
{
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

    /// <summary>
    /// Whether a value differs from the proposed one, both normalised: an adjusted value identical to the proposed one, or
    /// differing only by superfluous spaces, is no adjustment; a change of case of the name is one (ordinal comparison).
    /// </summary>
    public bool IsAdjustedFrom(ProposedPose proposed)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        return Name != proposed.Name || Difficulty != proposed.Difficulty || Flow != proposed.Flow;
    }
}

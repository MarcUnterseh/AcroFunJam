using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The transition published when a proposal is accepted (ADR 0028): the proposed transition, with the adjustments of the
/// validator if any. Same shape as <see cref="ProposedTransition"/>; the proposal keeps both. Never its poses.
/// </summary>
public sealed record RetainedTransition(TransitionName? Name, Difficulty Difficulty, TransitionDescription? Description)
{
    /// <summary>The proposed transition retained as is.</summary>
    public static RetainedTransition As(ProposedTransition proposed)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        return new RetainedTransition(proposed.Name, proposed.Difficulty, proposed.Description);
    }

    /// <summary>A retained transition read back as such (storage): it follows the content rules of a transition.</summary>
    public static Result<RetainedTransition> Create(string? name, string? baseDifficulty, string? flyerDifficulty, string? description)
    {
        var content = ProposedTransition.Create(name, baseDifficulty, flyerDifficulty, description);
        return content.IsFailure ? content.Error! : Result<RetainedTransition>.Success(As(content.Value!));
    }

    /// <summary>Whether the validator adjusted at least one field of the proposed transition (see <see cref="AdjustmentsFrom"/>).</summary>
    public bool IsAdjustedFrom(ProposedTransition proposed) => AdjustmentsFrom(proposed).Count > 0;

    /// <summary>
    /// The fields whose retained value differs from the proposed one, in the order of the form, each with both values. Both values
    /// are normalised: a correction differing only by superfluous spaces is no adjustment; a change of case of the name is one.
    /// </summary>
    public IReadOnlyList<TransitionFieldAdjustment> AdjustmentsFrom(ProposedTransition proposed)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        var adjustments = new List<TransitionFieldAdjustment>();
        if (proposed.Name != Name) adjustments.Add(new TransitionNameAdjustment(proposed.Name, Name));
        if (proposed.Difficulty.Base != Difficulty.Base)
            adjustments.Add(new TransitionBaseDifficultyAdjustment(proposed.Difficulty.Base, Difficulty.Base));
        if (proposed.Difficulty.Flyer != Difficulty.Flyer)
            adjustments.Add(new TransitionFlyerDifficultyAdjustment(proposed.Difficulty.Flyer, Difficulty.Flyer));
        if (proposed.Description != Description) adjustments.Add(new TransitionDescriptionAdjustment(proposed.Description, Description));
        return adjustments;
    }
}

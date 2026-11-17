using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The content of a transition proposal (story 7, ADR 0028): its optional name, its difficulties, which measure the passage
/// alone, and its optional public description.
/// </summary>
public sealed record ProposedTransition
{
    public TransitionName? Name { get; }

    public Difficulty Difficulty { get; }

    public TransitionDescription? Description { get; }

    /// <summary>The tags chosen by the contributor through the list (story 8, ADR 0033); none by default.</summary>
    public TagSet Tags { get; private init; } = TagSet.Empty;

    private ProposedTransition(TransitionName? name, Difficulty difficulty, TransitionDescription? description)
    {
        Name = name;
        Difficulty = difficulty;
        Description = description;
    }

    /// <summary>Checked in the order of the form: the name, then the difficulties (base first), then the description.</summary>
    public static Result<ProposedTransition> Create(string? name, string? baseDifficulty, string? flyerDifficulty, string? description)
    {
        var transitionName = TransitionName.CreateOptional(name);
        if (transitionName.IsFailure) return transitionName.Error!;
        var difficulty = Difficulty.FromCodes(baseDifficulty, flyerDifficulty);
        if (difficulty.IsFailure) return difficulty.Error!;
        var transitionDescription = TransitionDescription.CreateOptional(description);
        if (transitionDescription.IsFailure) return transitionDescription.Error!;
        return Result<ProposedTransition>.Success(new ProposedTransition(transitionName.Value, difficulty.Value!, transitionDescription.Value));
    }

    /// <summary>The proposed transition with the tags chosen through the list (story 8).</summary>
    public ProposedTransition Tagged(TagSet tags)
    {
        ArgumentNullException.ThrowIfNull(tags);
        return this with { Tags = tags };
    }

    /// <summary>
    /// The transition the validator retains: each adjusted value replaces the proposed one, the others are kept; the retained tags,
    /// chosen through the list, replace the proposed ones (none given: kept).
    /// </summary>
    public RetainedTransition Retain(TransitionAdjustments adjustments, TagSet? retainedTags = null)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        return new RetainedTransition(
            adjustments.AdjustsName ? adjustments.Name : Name,
            Difficulty.Create(adjustments.BaseDifficulty ?? Difficulty.Base, adjustments.FlyerDifficulty ?? Difficulty.Flyer).Value!,
            adjustments.AdjustsDescription ? adjustments.Description : Description)
        { Tags = retainedTags ?? Tags };
    }

    /// <summary>A proposed transition read back from storage, as it was recorded.</summary>
    public static ProposedTransition Restore(
        TransitionName? name, Difficulty difficulty, TransitionDescription? description, TagSet? tags = null) =>
        new(name, difficulty, description) { Tags = tags ?? TagSet.Empty };
}

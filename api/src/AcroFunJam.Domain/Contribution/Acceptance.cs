using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A validator accepted the proposal: its retained pose is published in the catalog (ADR 0022). With adjustments when
/// the retained pose differs from the proposed pose; an adjustment note may then accompany it.
/// </summary>
public sealed record Acceptance : ProposalDecision
{
    public RetainedPose Retained { get; }

    public AdjustmentNote? Note { get; }

    public bool HasAdjustments { get; }

    private Acceptance(ValidatorId by, DateTimeOffset at, RetainedPose retained, AdjustmentNote? note, bool hasAdjustments) : base(by, at)
    {
        Retained = retained;
        Note = note;
        HasAdjustments = hasAdjustments;
    }

    /// <summary>The acceptance of a proposed pose: with adjustments when the retained pose differs from it.</summary>
    public static Result<Acceptance> Of(ProposedPose proposed, RetainedPose retained, AdjustmentNote? note, ValidatorId by, DateTimeOffset at)
    {
        ArgumentNullException.ThrowIfNull(retained);
        var hasAdjustments = retained.IsAdjustedFrom(proposed);
        // A note explains adjustments to the contributor: without adjustment, it has nothing to explain.
        if (note is not null && !hasAdjustments) return ContributionErrors.AdjustmentNoteWithoutAdjustment;
        return Result<Acceptance>.Success(new Acceptance(by, at, retained, note, hasAdjustments));
    }
}

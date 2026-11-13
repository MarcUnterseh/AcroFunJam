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

    /// <summary>
    /// The proposal of a validator (or administrator), accepted at once by themselves when submitted (story 3): a fact
    /// recorded when it happens, never deduced from timestamps (ADR 0023). Never set by <see cref="Of"/>.
    /// </summary>
    public bool IsDirectPublication { get; private init; }

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
        if (DecisionRules.NoteRefusal(note, hasAdjustments) is { } refusal) return refusal;
        return Result<Acceptance>.Success(new Acceptance(by, at, retained, note, hasAdjustments));
    }

    /// <summary>
    /// An acceptance read back from storage, as it was recorded: its own coherence is checked as by <see cref="Of"/>; that of
    /// a direct publication, which depends on the proposal, by <see cref="PoseProposal.Rehydrate"/>.
    /// </summary>
    public static Result<Acceptance> Restore(
        ProposedPose proposed, RetainedPose retained, AdjustmentNote? note, ValidatorId by, DateTimeOffset at, bool isDirectPublication)
    {
        var acceptance = Of(proposed, retained, note, by, at);
        return acceptance.IsFailure
            ? acceptance
            : Result<Acceptance>.Success(acceptance.Value! with { IsDirectPublication = isDirectPublication });
    }

    /// <summary>
    /// The direct publication of a proposed pose (ADR 0023): retained as proposed, without note, decided by its contributor
    /// at the instant of the submission. Nothing can fail.
    /// </summary>
    public static Acceptance DirectPublication(ProposedPose proposed, ContributorId contributor, DateTimeOffset at)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        return new Acceptance(contributor.AsValidator(), at, proposed.Retain(PoseAdjustments.None), note: null, hasAdjustments: false)
        {
            IsDirectPublication = true,
        };
    }
}

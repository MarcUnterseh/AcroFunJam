using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A validator accepted a transition proposal: its retained transition is published in the catalog (ADR 0028), on the model of
/// <see cref="Acceptance"/> for a pose. With adjustments when the retained transition differs from the proposed one; an
/// adjustment note may then accompany it.
/// </summary>
public sealed record TransitionAcceptance : ProposalDecision
{
    public RetainedTransition Retained { get; }

    public AdjustmentNote? Note { get; }

    public bool HasAdjustments { get; }

    /// <summary>The proposal of a validator, accepted at once by themselves when submitted: a fact recorded when it happens (ADR 0023).</summary>
    public bool IsDirectPublication { get; private init; }

    private TransitionAcceptance(ValidatorId by, DateTimeOffset at, RetainedTransition retained, AdjustmentNote? note, bool hasAdjustments)
        : base(by, at)
    {
        Retained = retained;
        Note = note;
        HasAdjustments = hasAdjustments;
    }

    /// <summary>The acceptance of a proposed transition: with adjustments when the retained transition differs from it.</summary>
    public static Result<TransitionAcceptance> Of(
        ProposedTransition proposed, RetainedTransition retained, AdjustmentNote? note, ValidatorId by, DateTimeOffset at)
    {
        ArgumentNullException.ThrowIfNull(retained);
        var hasAdjustments = retained.IsAdjustedFrom(proposed);
        if (DecisionRules.NoteRefusal(note, hasAdjustments) is { } refusal) return refusal;
        return Result<TransitionAcceptance>.Success(new TransitionAcceptance(by, at, retained, note, hasAdjustments));
    }

    /// <summary>
    /// An acceptance read back from storage, as it was recorded: its own coherence is checked as by <see cref="Of"/>; that of a
    /// direct publication, which depends on the proposal, by <see cref="TransitionProposal.Rehydrate"/>.
    /// </summary>
    public static Result<TransitionAcceptance> Restore(
        ProposedTransition proposed, RetainedTransition retained, AdjustmentNote? note, ValidatorId by, DateTimeOffset at, bool isDirectPublication)
    {
        var acceptance = Of(proposed, retained, note, by, at);
        return acceptance.IsFailure
            ? acceptance
            : Result<TransitionAcceptance>.Success(acceptance.Value! with { IsDirectPublication = isDirectPublication });
    }

    /// <summary>
    /// The direct publication of a proposed transition (ADR 0023): retained as proposed, without note, decided by its contributor
    /// at the instant of the submission. Nothing can fail.
    /// </summary>
    public static TransitionAcceptance DirectPublication(ProposedTransition proposed, ContributorId contributor, DateTimeOffset at) =>
        new(contributor.AsValidator(), at, RetainedTransition.As(proposed), note: null, hasAdjustments: false) { IsDirectPublication = true };
}

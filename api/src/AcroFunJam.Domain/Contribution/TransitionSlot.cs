using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The place a transition takes between its start pose and its end pose, in this direction (story 7, R9, R10, ADR 0029): the
/// unnamed place, of which there is one, or the place of its name, compared by key. Two transitions never share a place,
/// published or pending.
/// </summary>
public sealed record TransitionSlot
{
    public TransitionPoses Poses { get; }

    /// <summary>The key of the name; none for the unnamed place.</summary>
    public TransitionNameKey? NameKey { get; }

    public bool IsUnnamed => NameKey is null;

    private TransitionSlot(TransitionPoses poses, TransitionNameKey? nameKey)
    {
        Poses = poses;
        NameKey = nameKey;
    }

    public static TransitionSlot Of(TransitionPoses poses, TransitionName? name)
    {
        ArgumentNullException.ThrowIfNull(poses);
        return new TransitionSlot(poses, name?.Key);
    }
}

/// <summary>
/// Whether the place of a proposed (or retained) transition is free, given by the caller to
/// <see cref="TransitionProposal.Submit"/> (ADR 0029).
/// </summary>
public enum TransitionSlotAvailability
{
    Available,
    TakenByPublishedTransition,
    TakenByPendingProposal,
}

public static class TransitionSlotAvailabilityRule
{
    extension(TransitionSlotAvailability)
    {
        /// <summary>When the place is taken both by a published transition and by a pending proposal, the catalog prevails.</summary>
        public static TransitionSlotAvailability From(bool publishedInCatalog, bool pendingProposal) =>
            publishedInCatalog ? TransitionSlotAvailability.TakenByPublishedTransition
            : pendingProposal ? TransitionSlotAvailability.TakenByPendingProposal
            : TransitionSlotAvailability.Available;
    }
}

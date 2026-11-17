using System.Diagnostics;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A proposal to add a transition to the catalog (story 7, ADR 0028): from a published pose to a published pose, its
/// content, its contributor and, once decided, the decision of a validator. It stores no pose name: the current names are
/// read from the catalog when it is presented.
/// </summary>
public sealed class TransitionProposal : AggregateRoot<TransitionProposalId>
{
    public ContributorId Contributor { get; }

    public TransitionPoses Poses { get; }

    public ProposedTransition Proposed { get; }

    public DateTimeOffset SubmittedAt { get; }

    /// <summary>What a validator decided; none while the proposal is pending.</summary>
    public ProposalDecision? Decision { get; private set; }

    /// <summary>Deduced from the decision: pending without one, otherwise accepted or rejected.</summary>
    public ProposalStatus Status => Decision switch
    {
        null => ProposalStatus.Pending,
        TransitionAcceptance => ProposalStatus.Accepted,
        Rejection => ProposalStatus.Rejected,
        _ => throw new UnreachableException($"Unknown decision: {Decision.GetType().Name}."),
    };

    private TransitionProposal(
        TransitionProposalId id, ContributorId contributor, TransitionPoses poses, ProposedTransition proposed, DateTimeOffset submittedAt) : base(id)
    {
        Contributor = contributor;
        Poses = poses;
        Proposed = proposed;
        SubmittedAt = submittedAt;
    }

    /// <summary>The place the proposed transition takes between its poses while pending (ADR 0029).</summary>
    public TransitionSlot Slot => TransitionSlot.Of(Poses, Proposed.Name);

    /// <summary>
    /// Whether each pose is published, and whether the place of the transition is free, are given by the caller, read in the
    /// catalog and among the pending proposals (R4, R9, R10): a pose still pending validation is not published. The start pose
    /// is checked first, then the end pose, then the place, for everyone, validators included.
    /// </summary>
    public static Result<TransitionProposal> Submit(
        TransitionProposalId id, Contributor contributor, TransitionPoses poses, ProposedTransition proposed, bool fromPosePublished,
        bool toPosePublished, TransitionSlotAvailability slot, DateTimeOffset now, TagChoice? tags = null)
    {
        ArgumentNullException.ThrowIfNull(contributor);
        ArgumentNullException.ThrowIfNull(poses);
        ArgumentNullException.ThrowIfNull(proposed);
        if (!fromPosePublished) return ContributionErrors.FromPoseNotFound;
        if (!toPosePublished) return ContributionErrors.ToPoseNotFound;
        // The tags, chosen through the list (story 8, ADR 0033), are checked after the poses and before the place.
        if (tags is { IsValid: false }) return new ProposedTagsNotInListError(tags.NotInList);
        if (SlotRefusal(proposed.Name is null, slot) is { } taken) return taken;
        proposed = proposed.Tagged(tags?.Tags ?? proposed.Tags);

        var proposal = new TransitionProposal(id, contributor.Id, poses, proposed, now);
        proposal.Raise(new TransitionProposed(id, contributor.Id, poses, proposed.Name, now));
        // Direct publication: a validator's (or administrator's) proposal is accepted at once, by themselves (R2, ADR 0023).
        if (contributor.IsValidator)
            proposal.Record(TransitionAcceptance.DirectPublication(proposed, contributor.Id, now));
        return Result<TransitionProposal>.Success(proposal);
    }

    /// <summary>Why the place is not free, if so: the unnamed place or a name, taken in the catalog or by a pending proposal.</summary>
    private static Error? SlotRefusal(bool unnamed, TransitionSlotAvailability slot) => (unnamed, slot) switch
    {
        (_, TransitionSlotAvailability.Available) => null,
        (true, TransitionSlotAvailability.TakenByPublishedTransition) => ContributionErrors.UnnamedTransitionAlreadyInCatalog,
        (true, TransitionSlotAvailability.TakenByPendingProposal) => ContributionErrors.UnnamedTransitionAlreadyPending,
        (false, TransitionSlotAvailability.TakenByPublishedTransition) => ContributionErrors.TransitionNameAlreadyInCatalog,
        (false, TransitionSlotAvailability.TakenByPendingProposal) => ContributionErrors.TransitionNameAlreadyPending,
        _ => throw new UnreachableException($"Unknown availability: {slot}."),
    };

    /// <summary>
    /// Restores a proposal loaded from storage, with its decision if any, without raising any event. A direct publication must be
    /// exactly the one its submission recorded (ADR 0023): otherwise the stored data is corrupt, a bug.
    /// </summary>
    public static TransitionProposal Rehydrate(
        TransitionProposalId id, ContributorId contributor, TransitionPoses poses, ProposedTransition proposed, DateTimeOffset submittedAt,
        ProposalDecision? decision = null)
    {
        ArgumentNullException.ThrowIfNull(proposed);
        if (decision is TransitionAcceptance { IsDirectPublication: true } published
            && published != TransitionAcceptance.DirectPublication(proposed, contributor, submittedAt))
            throw new InvalidOperationException($"Incoherent direct publication of the transition proposal {id.Value}.");

        return new TransitionProposal(id, contributor, poses, proposed, submittedAt) { Decision = decision };
    }

    /// <summary>Whether this validator is the person who submitted the proposal (« toi » in the validation queue).</summary>
    public bool WasSubmittedBy(ValidatorId validator) => Contributor.AsValidator() == validator;

    /// <summary>
    /// The place the transition would take if accepted with these adjustments (ADR 0029): that of its retained name, or the
    /// unnamed one; the caller reads whether it is free.
    /// </summary>
    public TransitionSlot SlotIfAccepted(TransitionAdjustments adjustments) => TransitionSlot.Of(Poses, Proposed.Retain(adjustments).Name);

    /// <summary>
    /// A validator accepts the proposal, so that its retained transition is published: the proposed transition, or the
    /// transition with the validator's adjustments, then possibly explained by a note (R15 to R18). The availability is that of
    /// the place of the retained transition, this proposal left out.
    /// </summary>
    public Result<TransitionAcceptance> Accept(
        Validator by, TransitionAdjustments adjustments, AdjustmentNote? note, TransitionSlotAvailability retainedSlot, DateTimeOffset now,
        TagChoice? retainedTags = null)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        if (DecisionRules.CannotBeDecided(by, Decision) is { } refusal) return refusal;
        // The retained tags, chosen through the list (E7): none given keeps the proposed ones.
        if (retainedTags is { IsValid: false }) return new ProposedTagsNotInListError(retainedTags.NotInList);
        var retained = Proposed.Retain(adjustments, retainedTags?.Tags);
        // The acceptance protects its own coherence (a note only with adjustments), checked before the place.
        var acceptance = TransitionAcceptance.Of(Proposed, retained, note, by.Id, now);
        if (acceptance.IsFailure) return acceptance;
        if (SlotRefusal(retained.Name is null, retainedSlot) is { } taken) return taken;

        Record(acceptance.Value!);
        return acceptance;
    }

    /// <summary>A validator rejects the proposal, with a reason for its contributor: nothing is published, its place is free again.</summary>
    public Result<Rejection> Reject(Validator by, RejectionReason reason, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(reason);
        if (DecisionRules.CannotBeDecided(by, Decision) is { } refusal) return refusal;

        var rejection = new Rejection(by.Id, now, reason);
        Decision = rejection;
        Raise(new TransitionProposalRejected(Id, by.Id, reason, now));
        return Result<Rejection>.Success(rejection);
    }

    private void Record(TransitionAcceptance acceptance)
    {
        Decision = acceptance;
        Raise(new TransitionProposalAccepted(Id, acceptance.By, acceptance.HasAdjustments, acceptance.At));
    }
}

using System.Diagnostics;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A proposal to add a pose to the catalog (ADR 0014): the proposed pose, its contributor and, once decided, the
/// decision of a validator (ADR 0022). The availability of the name is given by the caller; the aggregate decides
/// what it means.
/// </summary>
public sealed class PoseProposal : AggregateRoot<PoseProposalId>
{
    public ContributorId Contributor { get; }

    public ProposedPose Pose { get; }

    public DateTimeOffset SubmittedAt { get; }

    /// <summary>What a validator decided; none while the proposal is pending.</summary>
    public ProposalDecision? Decision { get; private set; }

    /// <summary>Deduced from the decision: pending without one, otherwise accepted or rejected.</summary>
    public ProposalStatus Status => Decision switch
    {
        null => ProposalStatus.Pending,
        Acceptance => ProposalStatus.Accepted,
        Rejection => ProposalStatus.Rejected,
        _ => throw new UnreachableException($"Unknown decision: {Decision.GetType().Name}."),
    };

    private PoseProposal(PoseProposalId id, ContributorId contributor, ProposedPose pose, DateTimeOffset submittedAt) : base(id)
    {
        Contributor = contributor;
        Pose = pose;
        SubmittedAt = submittedAt;
    }

    public static Result<PoseProposal> Submit(
        PoseProposalId id, Contributor contributor, ProposedPose pose, NameAvailability availability, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(contributor);
        ArgumentNullException.ThrowIfNull(pose);
        // The name is checked for everyone, validators included.
        if (NameRefusal(availability) is { } taken) return taken;

        var proposal = new PoseProposal(id, contributor.Id, pose, now);
        proposal.Raise(new PoseProposed(id, contributor.Id, pose.Name, now));
        // Direct publication: a validator's (or administrator's) proposal is accepted at once, by themselves.
        if (contributor.IsValidator)
            proposal.Record(Acceptance.Of(pose, pose.Retain(PoseAdjustments.None), note: null, contributor.Id.AsValidator(), now).Value!);
        return Result<PoseProposal>.Success(proposal);
    }

    /// <summary>Restores a proposal loaded from storage, with its decision if any, without raising any event.</summary>
    public static PoseProposal Rehydrate(
        PoseProposalId id, ContributorId contributor, ProposedPose pose, DateTimeOffset submittedAt, ProposalDecision? decision = null) =>
        new(id, contributor, pose, submittedAt) { Decision = decision };

    /// <summary>Whether this validator is the person who submitted the proposal (« toi » in the validation queue).</summary>
    public bool WasSubmittedBy(ValidatorId validator) => Contributor.AsValidator() == validator;

    /// <summary>
    /// A validator accepts the proposal, so that its retained pose is published: the proposed pose, or the pose with the
    /// validator's adjustments, then possibly explained by a note (ADR 0022). The availability is that of the retained name.
    /// </summary>
    public Result<Acceptance> Accept(Validator by, RetainedPose retained, AdjustmentNote? note, NameAvailability availability, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(retained);
        if (CannotBeDecidedBy(by) is { } refusal) return refusal;
        // The acceptance protects its own coherence (a note only with adjustments), checked before the name.
        var acceptance = Acceptance.Of(Pose, retained, note, by.Id, now);
        if (acceptance.IsFailure) return acceptance;
        // The retained name is unique against the catalog and the other pending proposals, not against this one: the
        // caller leaves it out of the availability.
        if (NameRefusal(availability) is { } taken) return taken;

        return Result<Acceptance>.Success(Record(acceptance.Value!));
    }

    /// <summary>A validator rejects the proposal, with a reason for its contributor: nothing is published.</summary>
    public Result<Rejection> Reject(Validator by, RejectionReason reason, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(reason);
        if (CannotBeDecidedBy(by) is { } refusal) return refusal;

        return Result<Rejection>.Success(RecordRejection(by.Id, reason, now));
    }

    /// <summary>
    /// Why the decider may not decide, if so: the capability is checked first, as read when deciding (ADR 0022);
    /// then a decision is irreversible, the first one recorded prevails.
    /// </summary>
    private Error? CannotBeDecidedBy(Validator by)
    {
        ArgumentNullException.ThrowIfNull(by);
        if (!by.CanDecide) return ContributionErrors.ValidatorRequired;
        return Decision is null ? null : ContributionErrors.ProposalAlreadyDecided;
    }

    private static Error? NameRefusal(NameAvailability availability) => availability switch
    {
        NameAvailability.TakenByPublishedPose => ContributionErrors.PoseNameAlreadyInCatalog,
        NameAvailability.TakenByPendingProposal => ContributionErrors.PoseNameAlreadyPending,
        _ => null,
    };

    private Acceptance Record(Acceptance acceptance)
    {
        Decision = acceptance;
        Raise(new PoseProposalAccepted(Id, acceptance.By, acceptance.HasAdjustments, acceptance.At));
        return acceptance;
    }

    private Rejection RecordRejection(ValidatorId by, RejectionReason reason, DateTimeOffset now)
    {
        var rejection = new Rejection(by, now, reason);
        Decision = rejection;
        Raise(new PoseProposalRejected(Id, by, reason, now));
        return rejection;
    }
}

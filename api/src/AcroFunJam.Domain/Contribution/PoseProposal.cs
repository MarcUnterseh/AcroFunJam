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

    public bool IsAccepted => Status == ProposalStatus.Accepted;

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
        if (availability == NameAvailability.TakenByPublishedPose) return ContributionErrors.PoseNameAlreadyInCatalog;
        if (availability == NameAvailability.TakenByPendingProposal) return ContributionErrors.PoseNameAlreadyPending;

        var proposal = new PoseProposal(id, contributor.Id, pose, now);
        proposal.Raise(new PoseProposed(id, contributor.Id, pose.Name, now));
        // Direct publication: a validator's (or administrator's) proposal is accepted at once, by themselves.
        if (contributor.IsValidator) proposal.RecordAcceptance(contributor.Id.AsValidator(), now);
        return Result<PoseProposal>.Success(proposal);
    }

    /// <summary>Restores a proposal loaded from storage, with its decision if any, without raising any event.</summary>
    public static PoseProposal Rehydrate(
        PoseProposalId id, ContributorId contributor, ProposedPose pose, DateTimeOffset submittedAt, ProposalDecision? decision = null) =>
        new(id, contributor, pose, submittedAt) { Decision = decision };

    /// <summary>Whether this validator is the person who submitted the proposal (« toi » in the validation queue).</summary>
    public bool WasSubmittedBy(ValidatorId validator) => Contributor.AsValidator() == validator;

    /// <summary>A validator accepts the proposal, so that its pose is published.</summary>
    public Result<Acceptance> Accept(Validator by, DateTimeOffset now)
    {
        if (CannotBeDecidedBy(by) is { } refusal) return refusal;
        return Result<Acceptance>.Success(RecordAcceptance(by.Id, now));
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

    private Acceptance RecordAcceptance(ValidatorId by, DateTimeOffset now)
    {
        var acceptance = new Acceptance(by, now);
        Decision = acceptance;
        Raise(new PoseProposalAccepted(Id, by, now));
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

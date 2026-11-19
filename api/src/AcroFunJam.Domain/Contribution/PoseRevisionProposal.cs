using System.Diagnostics;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A proposal to revise a published pose (story 6, ADR 0026): the pose it revises, the values of the pose before it and the
/// pose as revised, its contributor and, once decided, the decision of a validator.
/// </summary>
public sealed class PoseRevisionProposal : AggregateRoot<PoseRevisionProposalId>, IPendingProposal
{
    public ContributorId Contributor { get; }

    public PublishedPoseId Pose { get; }

    public ProposedRevision Revision { get; }

    /// <summary>The version of the pose the revision started from (ADR 0024).</summary>
    public PublishedPoseVersion BaseVersion { get; }

    public DateTimeOffset SubmittedAt { get; }

    /// <summary>Known in the validation queue by the name of the pose before the revision (ADR 0027).</summary>
    public PoseName QueuedName => Revision.Before.Name;

    /// <summary>The optional message of the contributor, for the validator (decision B of 2026-11-12).</summary>
    public RevisionMessage? Message { get; private init; }

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

    private PoseRevisionProposal(
        PoseRevisionProposalId id, ContributorId contributor, PublishedPoseId pose, PublishedPoseVersion baseVersion, ProposedRevision revision,
        DateTimeOffset submittedAt)
        : base(id)
    {
        Contributor = contributor;
        Pose = pose;
        BaseVersion = baseVersion;
        Revision = revision;
        SubmittedAt = submittedAt;
    }

    public static Result<PoseRevisionProposal> Submit(
        PoseRevisionProposalId id, Contributor contributor, PublishedPose pose, PublishedPoseVersion startedFrom, PoseChanges changes,
        RevisionMessage? message, bool revisionAlreadyPending, NameAvailability availability, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(contributor);
        ArgumentNullException.ThrowIfNull(pose);
        // The version first: a pose revised meanwhile is never answered « ne change rien » (ADR 0024).
        if (startedFrom != pose.Version) return ContributionErrors.PoseChangedSinceRevisionStarted;
        var revision = ProposedRevision.Of(pose.Values, changes);
        if (revision.IsFailure) return revision.Error!;
        // One pending revision per pose, for everyone, validators included (decision of 2026-11-12).
        if (revisionAlreadyPending) return ContributionErrors.PoseRevisionAlreadyPending;
        if (NameRefusals.Of(availability) is { } taken) return taken;

        var proposal = new PoseRevisionProposal(id, contributor.Id, pose.Id, startedFrom, revision.Value!, now) { Message = message };
        proposal.Raise(new PoseRevisionProposed(id, contributor.Id, pose.Id, now));
        // Direct publication: a validator's (or administrator's) revision is accepted at once, by themselves (ADR 0023, ADR 0026).
        if (contributor.IsValidator)
        {
            var acceptance = Acceptance.DirectPublication(proposal.Revision.After, contributor.Id, now);
            proposal.Decision = acceptance;
            proposal.Raise(new PoseRevisionAccepted(id, acceptance.By, WithAdjustments: false, now));
        }

        return Result<PoseRevisionProposal>.Success(proposal);
    }

    /// <summary>
    /// A validator accepts the revision, so that the pose is revised with the retained revision: the revised pose, or the
    /// pose with the validator's adjustments, then possibly explained by a note (ADR 0022, ADR 0026). The availability is
    /// that of the retained name.
    /// </summary>
    public Result<Acceptance> Accept(
        Validator by, PoseAdjustments adjustments, AdjustmentNote? note, NameAvailability availability, DateTimeOffset now, TagChoice? retainedTags = null)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        if (DecisionRules.CannotBeDecided(by, Decision) is { } refusal) return refusal;
        // Story 9a: the retained tags, chosen through the list for a pose; none keeps the proposed ones.
        if (ProposedTagsNotApplicableError.Of(retainedTags) is { } refusedTags) return refusedTags;
        var retained = Revision.After.Retain(adjustments, retainedTags?.Tags);
        var acceptance = Acceptance.Of(Revision.After, retained, note, by.Id, now);
        if (acceptance.IsFailure) return acceptance;
        // Bringing the pose back to its values amounts to rejecting the revision (story 6).
        if (Revision.Before.SameValuesAs(retained.Name, retained.Difficulty, retained.Flow, retained.Tags))
            return ContributionErrors.RetainedRevisionChangesNothing;
        if (NameRefusals.Of(availability) is { } taken) return taken;

        Decision = acceptance.Value!;
        Raise(new PoseRevisionAccepted(Id, by.Id, acceptance.Value!.HasAdjustments, now));
        return acceptance;
    }

    /// <summary>
    /// The name key an acceptance with these adjustments takes, to reserve it (ADR 0025): none when the retained name keeps the
    /// key of the pose, change of case included.
    /// </summary>
    public PoseNameKey? NameKeyToReserve(PoseAdjustments adjustments)
    {
        ArgumentNullException.ThrowIfNull(adjustments);
        var retained = Revision.After.Retain(adjustments).Name.Key;
        return retained == Revision.Before.Name.Key ? null : retained;
    }

    /// <summary>Whether this validator is the person who submitted the revision (« toi » in the validation queue).</summary>
    public bool WasSubmittedBy(ValidatorId validator) => Contributor.AsValidator() == validator;

    /// <summary>A validator rejects the revision, with a reason for its contributor: the pose stays as it is.</summary>
    public Result<Rejection> Reject(Validator by, RejectionReason reason, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(reason);
        if (DecisionRules.CannotBeDecided(by, Decision) is { } refusal) return refusal;

        var rejection = new Rejection(by.Id, now, reason);
        Decision = rejection;
        Raise(new PoseRevisionRejected(Id, by.Id, reason, now));
        return Result<Rejection>.Success(rejection);
    }

    /// <summary>Restores a revision proposal loaded from storage, with its decision if any, without raising any event.</summary>
    public static PoseRevisionProposal Rehydrate(
        PoseRevisionProposalId id, ContributorId contributor, PublishedPoseId pose, PublishedPoseVersion baseVersion, ProposedRevision revision,
        DateTimeOffset submittedAt, RevisionMessage? message = null, ProposalDecision? decision = null)
    {
        ArgumentNullException.ThrowIfNull(revision);
        // A direct publication must be exactly the one its submission recorded (ADR 0023): otherwise the stored data is corrupt.
        if (decision is Acceptance { IsDirectPublication: true } published
            && published != Acceptance.DirectPublication(revision.After, contributor, submittedAt))
            throw new InvalidOperationException($"Incoherent direct publication of the pose revision proposal {id.Value}.");

        return new PoseRevisionProposal(id, contributor, pose, baseVersion, revision, submittedAt) { Message = message, Decision = decision };
    }
}

using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A proposal to add a pose to the catalog (ADR 0014): the proposed pose, its contributor and its status.
/// The availability of the name is given by the caller; the aggregate decides what it means.
/// </summary>
public sealed class PoseProposal : AggregateRoot<PoseProposalId>
{
    public ContributorId Contributor { get; }

    public ProposedPose Pose { get; }

    public ProposalStatus Status { get; private set; }

    public DateTimeOffset SubmittedAt { get; }

    public ContributorId? AcceptedBy { get; private set; }

    public DateTimeOffset? AcceptedAt { get; private set; }

    public bool IsAccepted => Status == ProposalStatus.Accepted;

    private PoseProposal(PoseProposalId id, ContributorId contributor, ProposedPose pose, DateTimeOffset submittedAt) : base(id)
    {
        Contributor = contributor;
        Pose = pose;
        Status = ProposalStatus.Pending;
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
        if (contributor.IsValidator) proposal.Accept(contributor.Id, now);
        return Result<PoseProposal>.Success(proposal);
    }

    private void Accept(ContributorId by, DateTimeOffset now)
    {
        Status = ProposalStatus.Accepted;
        AcceptedBy = by;
        AcceptedAt = now;
        Raise(new PoseProposalAccepted(Id, by, now));
    }
}

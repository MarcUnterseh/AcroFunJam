using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Translation between <see cref="PoseProposal"/> and its persistence shape, <see cref="PoseProposalRecord"/>.</summary>
internal static class PoseProposalRecords
{
    internal static PoseProposal ToProposal(PoseProposalRecord record)
    {
        var proposed = ToProposedPose(record);
        return PoseProposal.Rehydrate(
            new PoseProposalId(record.Id), new ContributorId(record.ContributorId), proposed, record.SubmittedAt, ToDecision(record, proposed));
    }

    // Stored data always met the rules when written (and the check constraints keep it coherent): breaking them now
    // is a bug, reported as such.
    private static ProposalDecision? ToDecision(PoseProposalRecord record, ProposedPose proposed) => record.Status switch
    {
        PendingStatus => null,
        AcceptedStatus => ToAcceptance(record, proposed),
        RejectedStatus => new Rejection(DecidedBy(record), DecidedAt(record), ToRejectionReason(record)),
        _ => throw Invalid(record, $"status '{record.Status}'"),
    };

    private static Acceptance ToAcceptance(PoseProposalRecord record, ProposedPose proposed) =>
        Acceptance.Of(proposed, ToRetainedPose(record), ToAdjustmentNote(record), DecidedBy(record), DecidedAt(record)) is
            { IsSuccess: true } acceptance
            ? acceptance.Value!
            : throw Invalid(record, "adjustment note");

    private static ValidatorId DecidedBy(PoseProposalRecord record) =>
        record.DecidedBy is { } by ? new ValidatorId(by) : throw Invalid(record, "decision without validator");

    private static DateTimeOffset DecidedAt(PoseProposalRecord record) =>
        record.DecidedAt ?? throw Invalid(record, "decision without date");

    private static RejectionReason ToRejectionReason(PoseProposalRecord record) =>
        RejectionReason.Create(record.RejectionReason) is { IsSuccess: true } reason
            ? reason.Value!
            : throw Invalid(record, "rejection reason");

    private static RetainedPose ToRetainedPose(PoseProposalRecord record) =>
        RetainedPose.Create(
                record.RetainedName, record.RetainedBaseDifficulty, record.RetainedFlyerDifficulty, record.RetainedCanStartFlow,
                record.RetainedCanEndFlow) is { IsSuccess: true } retained
            ? retained.Value!
            : throw Invalid(record, "retained pose");

    private static AdjustmentNote? ToAdjustmentNote(PoseProposalRecord record) =>
        AdjustmentNote.Create(record.AdjustmentNote) is { IsSuccess: true } note ? note.Value : throw Invalid(record, "adjustment note");

    private static ProposedPose ToProposedPose(PoseProposalRecord record) =>
        ProposedPose.Create(record.Name, record.BaseDifficulty, record.FlyerDifficulty, record.CanStartFlow, record.CanEndFlow) is
            { IsSuccess: true } pose
            ? pose.Value!
            : throw Invalid(record, "proposed pose");

    private static InvalidOperationException Invalid(PoseProposalRecord record, string what) =>
        new($"Invalid {what} in contribution.pose_proposals (id {record.Id}).");

    internal const string PendingStatus = "pending";
    private const string AcceptedStatus = "accepted";
    private const string RejectedStatus = "rejected";

    private static string ToCode(ProposalStatus status) => status switch
    {
        ProposalStatus.Pending => PendingStatus,
        ProposalStatus.Accepted => AcceptedStatus,
        ProposalStatus.Rejected => RejectedStatus,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown proposal status."),
    };

    internal static PoseProposalRecord ToRecord(PoseProposal proposal)
    {
        var acceptance = proposal.Decision as Acceptance;
        return new PoseProposalRecord
        {
            Id = proposal.Id.Value,
            ContributorId = proposal.Contributor.Value,
            Name = proposal.Pose.Name.Value,
            NameKey = proposal.Pose.Name.Key.Value,
            BaseDifficulty = proposal.Pose.Difficulty.Base.ToCode(),
            FlyerDifficulty = proposal.Pose.Difficulty.Flyer.ToCode(),
            CanStartFlow = proposal.Pose.Flow.CanStartFlow,
            CanEndFlow = proposal.Pose.Flow.CanEndFlow,
            Status = ToCode(proposal.Status),
            SubmittedAt = proposal.SubmittedAt,
            DecidedBy = proposal.Decision?.By.Value,
            DecidedAt = proposal.Decision?.At,
            RejectionReason = (proposal.Decision as Rejection)?.Reason.Value,
            RetainedName = acceptance?.Retained.Name.Value,
            RetainedBaseDifficulty = acceptance?.Retained.Difficulty.Base.ToCode(),
            RetainedFlyerDifficulty = acceptance?.Retained.Difficulty.Flyer.ToCode(),
            RetainedCanStartFlow = acceptance?.Retained.Flow.CanStartFlow,
            RetainedCanEndFlow = acceptance?.Retained.Flow.CanEndFlow,
            AdjustmentNote = acceptance?.Note?.Value,
        };
    }
}

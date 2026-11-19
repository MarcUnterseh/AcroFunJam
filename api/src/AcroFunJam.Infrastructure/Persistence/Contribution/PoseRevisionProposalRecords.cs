using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Translation between a <see cref="PoseRevisionProposal"/> and its record (ADR 0026).</summary>
internal static class PoseRevisionProposalRecords
{
    public const string PendingStatus = "pending";
    private const string AcceptedStatus = "accepted";
    private const string RejectedStatus = "rejected";

    public static PoseRevisionProposalRecord ToRecord(PoseRevisionProposal proposal)
    {
        var before = proposal.Revision.Before;
        var after = proposal.Revision.After;
        var acceptance = proposal.Decision as Acceptance;
        return new PoseRevisionProposalRecord
        {
            Id = proposal.Id.Value,
            ContributorId = proposal.Contributor.Value,
            PoseId = proposal.Pose.Value,
            BaseVersion = proposal.BaseVersion.Value,
            PriorName = before.Name.Value,
            PriorBaseDifficulty = before.Difficulty.Base.ToCode(),
            PriorFlyerDifficulty = before.Difficulty.Flyer.ToCode(),
            PriorCanStartFlow = before.Flow.CanStartFlow,
            PriorCanEndFlow = before.Flow.CanEndFlow,
            Name = after.Name.Value,
            BaseDifficulty = after.Difficulty.Base.ToCode(),
            FlyerDifficulty = after.Difficulty.Flyer.ToCode(),
            CanStartFlow = after.Flow.CanStartFlow,
            CanEndFlow = after.Flow.CanEndFlow,
            PriorTagIds = [.. before.Tags.Ids.Select(t => t.Value)],
            TagIds = [.. after.Tags.Ids.Select(t => t.Value)],
            RetainedTagIds = acceptance is null ? null : [.. acceptance.Retained.Tags.Ids.Select(t => t.Value)],
            ReservedNameKey = proposal.Revision.ReservedNameKey?.Value,
            Message = proposal.Message?.Value,
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
            PublishedDirectly = acceptance?.IsDirectPublication ?? false,
        };
    }

    // Stored data always met the rules when written (and the check constraints keep it coherent): breaking them now
    // is a bug, reported as such.
    public static PoseRevisionProposal ToProposal(PoseRevisionProposalRecord record)
    {
        var before = new PriorPose(
            PoseName.Create(record.PriorName).Value ?? throw Invalid(record, "prior name"),
            Difficulty.FromCodes(record.PriorBaseDifficulty, record.PriorFlyerDifficulty).Value ?? throw Invalid(record, "prior difficulty"),
            FlowBoundaries.Create(record.PriorCanStartFlow, record.PriorCanEndFlow).Value!) { Tags = ToTags(record.PriorTagIds) };
        var after = (ProposedPose.Create(record.Name, record.BaseDifficulty, record.FlyerDifficulty, record.CanStartFlow, record.CanEndFlow)
            .Value ?? throw Invalid(record, "revised pose")).Tagged(ToTags(record.TagIds));
        return PoseRevisionProposal.Rehydrate(
            new PoseRevisionProposalId(record.Id),
            new ContributorId(record.ContributorId),
            new PublishedPoseId(record.PoseId),
            new PublishedPoseVersion(record.BaseVersion),
            ProposedRevision.Restore(before, after),
            record.SubmittedAt,
            RevisionMessage.Create(record.Message) is { IsSuccess: true } message ? message.Value : throw Invalid(record, "message"),
            ToDecision(record, after));
    }

    private static ProposalDecision? ToDecision(PoseRevisionProposalRecord record, ProposedPose after) => record.Status switch
    {
        PendingStatus => null,
        AcceptedStatus => ToAcceptance(record, after),
        RejectedStatus => new Rejection(DecidedBy(record), DecidedAt(record), ToRejectionReason(record)),
        _ => throw Invalid(record, $"status '{record.Status}'"),
    };

    private static Acceptance ToAcceptance(PoseRevisionProposalRecord record, ProposedPose after) =>
        Acceptance.Restore(after, ToRetainedPose(record), ToAdjustmentNote(record), DecidedBy(record), DecidedAt(record), record.PublishedDirectly) is
            { IsSuccess: true } acceptance
            ? acceptance.Value!
            : throw Invalid(record, "adjustment note");

    private static ValidatorId DecidedBy(PoseRevisionProposalRecord record) =>
        record.DecidedBy is { } by ? new ValidatorId(by) : throw Invalid(record, "decision without validator");

    private static DateTimeOffset DecidedAt(PoseRevisionProposalRecord record) =>
        record.DecidedAt ?? throw Invalid(record, "decision without date");

    private static RejectionReason ToRejectionReason(PoseRevisionProposalRecord record) =>
        RejectionReason.Create(record.RejectionReason) is { IsSuccess: true } reason ? reason.Value! : throw Invalid(record, "rejection reason");

    private static RetainedPose ToRetainedPose(PoseRevisionProposalRecord record) =>
        RetainedPose.Create(
                record.RetainedName, record.RetainedBaseDifficulty, record.RetainedFlyerDifficulty, record.RetainedCanStartFlow,
                record.RetainedCanEndFlow) is { IsSuccess: true } retained
            ? retained.Value! with { Tags = ToTags(record.RetainedTagIds ?? throw Invalid(record, "retained tags")) }
            : throw Invalid(record, "retained pose");

    private static TagSet ToTags(IEnumerable<Guid> ids) => TagSet.Of(ids.Select(id => new TagId(id)));

    private static AdjustmentNote? ToAdjustmentNote(PoseRevisionProposalRecord record) =>
        AdjustmentNote.Create(record.AdjustmentNote) is { IsSuccess: true } note ? note.Value : throw Invalid(record, "adjustment note");

    private static string ToCode(ProposalStatus status) => status switch
    {
        ProposalStatus.Pending => PendingStatus,
        ProposalStatus.Accepted => AcceptedStatus,
        ProposalStatus.Rejected => RejectedStatus,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown proposal status."),
    };

    private static InvalidOperationException Invalid(PoseRevisionProposalRecord record, string what) =>
        new($"Invalid stored {what} of the pose revision proposal {record.Id}.");
}

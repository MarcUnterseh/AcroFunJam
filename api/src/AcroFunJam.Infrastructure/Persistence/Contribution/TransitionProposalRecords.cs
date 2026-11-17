using System.Diagnostics;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Translation between a <see cref="TransitionProposal"/> and its record (ADR 0028).</summary>
internal static class TransitionProposalRecords
{
    public const string PendingStatus = "pending";
    private const string AcceptedStatus = "accepted";
    private const string RejectedStatus = "rejected";

    public static TransitionProposalRecord ToRecord(TransitionProposal proposal)
    {
        var proposed = proposal.Proposed;
        var acceptance = proposal.Decision as TransitionAcceptance;
        return new TransitionProposalRecord
        {
            Id = proposal.Id.Value,
            ContributorId = proposal.Contributor.Value,
            FromPoseId = proposal.Poses.From.Value,
            ToPoseId = proposal.Poses.To.Value,
            Name = proposed.Name?.Value,
            NameKey = proposed.Name?.Key.Value,
            BaseDifficulty = proposed.Difficulty.Base.ToCode(),
            FlyerDifficulty = proposed.Difficulty.Flyer.ToCode(),
            Description = proposed.Description?.Value,
            ProposedTagIds = [.. proposed.Tags.Ids.Select(t => t.Value)],
            Status = proposal.Status switch
            {
                ProposalStatus.Pending => PendingStatus,
                ProposalStatus.Accepted => AcceptedStatus,
                ProposalStatus.Rejected => RejectedStatus,
                _ => throw new UnreachableException($"Unknown status: {proposal.Status}."),
            },
            SubmittedAt = proposal.SubmittedAt,
            DecidedBy = proposal.Decision?.By.Value,
            DecidedAt = proposal.Decision?.At,
            RejectionReason = (proposal.Decision as Rejection)?.Reason.Value,
            RetainedName = acceptance?.Retained.Name?.Value,
            RetainedBaseDifficulty = acceptance?.Retained.Difficulty.Base.ToCode(),
            RetainedFlyerDifficulty = acceptance?.Retained.Difficulty.Flyer.ToCode(),
            RetainedDescription = acceptance?.Retained.Description?.Value,
            RetainedTagIds = acceptance is null ? null : [.. acceptance.Retained.Tags.Ids.Select(t => t.Value)],
            AdjustmentNote = acceptance?.Note?.Value,
            PublishedDirectly = acceptance?.IsDirectPublication ?? false,
        };
    }

    // Stored data always met the rules when written (and the check constraints keep it coherent): breaking them now
    // is a bug, reported as such.
    public static TransitionProposal ToProposal(TransitionProposalRecord record)
    {
        var proposed = (ProposedTransition.Create(record.Name, record.BaseDifficulty, record.FlyerDifficulty, record.Description).Value
            ?? throw Invalid(record, "proposed transition")).Tagged(TagsOf(record.ProposedTagIds));
        var contributor = new ContributorId(record.ContributorId);
        ProposalDecision? decision = record.Status switch
        {
            PendingStatus => null,
            AcceptedStatus => AcceptanceOf(record, proposed),
            RejectedStatus => new Rejection(
                new ValidatorId(record.DecidedBy ?? throw Invalid(record, "decider")),
                record.DecidedAt ?? throw Invalid(record, "decision date"),
                RejectionReason.Create(record.RejectionReason).Value ?? throw Invalid(record, "rejection reason")),
            _ => throw Invalid(record, "status"),
        };
        return TransitionProposal.Rehydrate(
            new TransitionProposalId(record.Id),
            contributor,
            new TransitionPoses(new PublishedPoseId(record.FromPoseId), new PublishedPoseId(record.ToPoseId)),
            proposed,
            record.SubmittedAt,
            decision);
    }

    private static TransitionAcceptance AcceptanceOf(TransitionProposalRecord record, ProposedTransition proposed)
    {
        var retained = RetainedTransition.Create(
            record.RetainedName, record.RetainedBaseDifficulty, record.RetainedFlyerDifficulty, record.RetainedDescription,
            TagsOf(record.RetainedTagIds ?? throw Invalid(record, "retained tags"))).Value
            ?? throw Invalid(record, "retained transition");
        var note = AdjustmentNote.Create(record.AdjustmentNote).Value;
        return TransitionAcceptance.Restore(
            proposed, retained, note, new ValidatorId(record.DecidedBy ?? throw Invalid(record, "decider")),
            record.DecidedAt ?? throw Invalid(record, "decision date"), record.PublishedDirectly).Value
            ?? throw Invalid(record, "acceptance");
    }

    private static TagSet TagsOf(IEnumerable<Guid> ids) => TagSet.Of(ids.Select(id => new TagId(id)));

    private static InvalidOperationException Invalid(TransitionProposalRecord record, string what) =>
        new($"Invalid stored {what} of the transition proposal {record.Id}.");
}

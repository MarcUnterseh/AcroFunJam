using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="ITransitionProposalRepository"/> (ADR 0028).</summary>
public sealed class EfTransitionProposalRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : ITransitionProposalRepository
{
    public void Add(TransitionProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        context.Set<TransitionProposalRecord>().Add(TransitionProposalRecords.ToRecord(proposal));
        aggregates.Track(proposal);
    }

    /// <summary>UPDATE … WHERE id = @id AND status = 'pending': the status is the concurrency token of the record (ADR 0022).</summary>
    public void Update(TransitionProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        var entry = context.Set<TransitionProposalRecord>().Attach(TransitionProposalRecords.ToRecord(proposal));
        entry.Property(p => p.Status).OriginalValue = TransitionProposalRecords.PendingStatus;
        entry.Property(p => p.Status).IsModified = true;
        entry.Property(p => p.DecidedBy).IsModified = true;
        entry.Property(p => p.DecidedAt).IsModified = true;
        entry.Property(p => p.RejectionReason).IsModified = true;
        entry.Property(p => p.RetainedName).IsModified = true;
        entry.Property(p => p.RetainedBaseDifficulty).IsModified = true;
        entry.Property(p => p.RetainedFlyerDifficulty).IsModified = true;
        entry.Property(p => p.RetainedDescription).IsModified = true;
        entry.Property(p => p.AdjustmentNote).IsModified = true;
        aggregates.Track(proposal);
    }

    public Task<bool> ExistsPendingInSlot(TransitionSlot slot, CancellationToken ct) => PendingIn(slot).AnyAsync(ct);

    public Task<bool> ExistsOtherPendingInSlot(TransitionSlot slot, TransitionProposalId except, CancellationToken ct) =>
        PendingIn(slot).AnyAsync(p => p.Id != except.Value, ct);

    public async Task<TransitionProposal?> GetById(TransitionProposalId id, CancellationToken ct)
    {
        var record = await context.Set<TransitionProposalRecord>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == id.Value, ct);
        return record is null ? null : TransitionProposalRecords.ToProposal(record);
    }

    private IQueryable<TransitionProposalRecord> PendingIn(TransitionSlot slot)
    {
        ArgumentNullException.ThrowIfNull(slot);
        var key = slot.NameKey?.Value;
        return context.Set<TransitionProposalRecord>().Where(
            p => p.FromPoseId == slot.Poses.From.Value && p.ToPoseId == slot.Poses.To.Value && p.NameKey == key
                 && p.Status == TransitionProposalRecords.PendingStatus);
    }
}

using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="IPoseProposalRepository"/>.</summary>
public sealed class EfPoseProposalRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : IPoseProposalRepository
{
    public void Add(PoseProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        context.Set<PoseProposalRecord>().Add(PoseProposalRecords.ToRecord(proposal));
        aggregates.Track(proposal);
    }

    public Task<bool> ExistsPendingWithNameKey(PoseNameKey key, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return PendingWithNameKey(key).AnyAsync(ct);
    }

    public Task<bool> ExistsOtherPendingWithNameKey(PoseNameKey key, PoseProposalId except, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return PendingWithNameKey(key).AnyAsync(p => p.Id != except.Value, ct);
    }

    private IQueryable<PoseProposalRecord> PendingWithNameKey(PoseNameKey key) =>
        context.Set<PoseProposalRecord>().Where(p => p.NameKey == key.Value && p.Status == PoseProposalRecords.PendingStatus);

    public async Task<PoseProposal?> GetById(PoseProposalId id, CancellationToken ct)
    {
        var record = await context.Set<PoseProposalRecord>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == id.Value, ct);
        return record is null ? null : PoseProposalRecords.ToProposal(record);
    }

    public void Update(PoseProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        // UPDATE … WHERE id = @id AND status = 'pending': the status is the concurrency token of the record.
        var entry = context.Set<PoseProposalRecord>().Attach(PoseProposalRecords.ToRecord(proposal));
        entry.Property(p => p.Status).OriginalValue = PoseProposalRecords.PendingStatus;
        entry.Property(p => p.Status).IsModified = true;
        entry.Property(p => p.DecidedBy).IsModified = true;
        entry.Property(p => p.DecidedAt).IsModified = true;
        entry.Property(p => p.RejectionReason).IsModified = true;
        entry.Property(p => p.RetainedName).IsModified = true;
        entry.Property(p => p.RetainedBaseDifficulty).IsModified = true;
        entry.Property(p => p.RetainedFlyerDifficulty).IsModified = true;
        entry.Property(p => p.RetainedCanStartFlow).IsModified = true;
        entry.Property(p => p.RetainedCanEndFlow).IsModified = true;
        entry.Property(p => p.AdjustmentNote).IsModified = true;
        aggregates.Track(proposal);
    }
}

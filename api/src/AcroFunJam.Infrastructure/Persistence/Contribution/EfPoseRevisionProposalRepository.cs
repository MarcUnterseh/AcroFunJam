using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>EF Core adapter of <see cref="IPoseRevisionProposalRepository"/> (ADR 0026).</summary>
public sealed class EfPoseRevisionProposalRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : IPoseRevisionProposalRepository
{
    public void Add(PoseRevisionProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        context.Set<PoseRevisionProposalRecord>().Add(PoseRevisionProposalRecords.ToRecord(proposal));
        aggregates.Track(proposal);
    }

    /// <summary>UPDATE … WHERE id = @id AND status = 'pending': the status is the concurrency token of the record (ADR 0022).</summary>
    public void Update(PoseRevisionProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        var entry = context.Set<PoseRevisionProposalRecord>().Attach(PoseRevisionProposalRecords.ToRecord(proposal));
        entry.Property(p => p.Status).OriginalValue = PoseRevisionProposalRecords.PendingStatus;
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
        entry.Property(p => p.RetainedTagIds).IsModified = true;
        aggregates.Track(proposal);
    }

    public Task<bool> ExistsPendingWithReservedNameKey(PoseNameKey key, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return context.Set<PoseRevisionProposalRecord>()
            .AnyAsync(p => p.ReservedNameKey == key.Value && p.Status == PoseRevisionProposalRecords.PendingStatus, ct);
    }

    public Task<bool> ExistsOtherPendingWithReservedNameKey(PoseNameKey key, PoseRevisionProposalId except, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return context.Set<PoseRevisionProposalRecord>().AnyAsync(
            p => p.ReservedNameKey == key.Value && p.Status == PoseRevisionProposalRecords.PendingStatus && p.Id != except.Value, ct);
    }

    public Task<bool> ExistsPendingForPose(PublishedPoseId pose, CancellationToken ct) =>
        context.Set<PoseRevisionProposalRecord>().AnyAsync(p => p.PoseId == pose.Value && p.Status == PoseRevisionProposalRecords.PendingStatus, ct);

    public async Task<PoseRevisionProposal?> GetPendingForPose(PublishedPoseId pose, CancellationToken ct)
    {
        var record = await context.Set<PoseRevisionProposalRecord>().AsNoTracking()
            .SingleOrDefaultAsync(p => p.PoseId == pose.Value && p.Status == PoseRevisionProposalRecords.PendingStatus, ct);
        return record is null ? null : PoseRevisionProposalRecords.ToProposal(record);
    }

    public async Task<PoseRevisionProposal?> GetById(PoseRevisionProposalId id, CancellationToken ct)
    {
        var record = await context.Set<PoseRevisionProposalRecord>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == id.Value, ct);
        return record is null ? null : PoseRevisionProposalRecords.ToProposal(record);
    }
}

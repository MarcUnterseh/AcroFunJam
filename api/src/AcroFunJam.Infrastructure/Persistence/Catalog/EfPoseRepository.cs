using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>EF Core adapter of <see cref="IPoseRepository"/>.</summary>
public sealed class EfPoseRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : IPoseRepository
{
    public void Add(Pose pose)
    {
        ArgumentNullException.ThrowIfNull(pose);
        context.Set<PoseRecord>().Add(ToRecord(pose));
        aggregates.Track(pose);
    }

    /// <summary>UPDATE … WHERE id = @id AND version = @read: the version is the concurrency token of the record (ADR 0024).</summary>
    public void Update(Pose pose)
    {
        ArgumentNullException.ThrowIfNull(pose);
        var entry = context.Set<PoseRecord>().Attach(ToRecord(pose));
        entry.Property(p => p.Version).OriginalValue = pose.Version.Value - 1;
        entry.Property(p => p.Version).IsModified = true;
        entry.Property(p => p.Name).IsModified = true;
        entry.Property(p => p.NameKey).IsModified = true;
        entry.Property(p => p.BaseDifficulty).IsModified = true;
        entry.Property(p => p.FlyerDifficulty).IsModified = true;
        entry.Property(p => p.CanStartFlow).IsModified = true;
        entry.Property(p => p.CanEndFlow).IsModified = true;
        entry.Property(p => p.TagIds).IsModified = true;
        aggregates.Track(pose);
    }

    private static PoseRecord ToRecord(Pose pose) => new()
    {
        Id = pose.Id.Value,
        Name = pose.Name.Value,
        NameKey = pose.Name.Key.Value,
        BaseDifficulty = pose.Difficulty.Base.ToCode(),
        FlyerDifficulty = pose.Difficulty.Flyer.ToCode(),
        CanStartFlow = pose.Flow.CanStartFlow,
        CanEndFlow = pose.Flow.CanEndFlow,
        SourceProposalId = pose.SourceProposalId?.Value,
        PublishedAt = pose.PublishedAt,
        Version = pose.Version.Value,
        TagIds = [.. pose.Tags.Ids.Select(t => t.Value)],
    };

    public async Task<IReadOnlyDictionary<PoseId, PoseName>> NamesOf(IReadOnlyCollection<PoseId> ids, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(ids);
        var values = ids.Select(id => id.Value).ToList();
        var names = await context.Set<PoseRecord>().AsNoTracking()
            .Where(p => values.Contains(p.Id))
            .Select(p => new { p.Id, p.Name })
            .ToListAsync(ct);
        // Stored names always met the rules when written.
        return names.ToDictionary(p => new PoseId(p.Id), p => PoseName.Create(p.Name).Value!);
    }

    public async Task<Pose?> GetById(PoseId id, CancellationToken ct)
    {
        var record = await context.Set<PoseRecord>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == id.Value, ct);
        if (record is null) return null;

        // Stored data always met the rules when written: breaking them now is a bug.
        var pose = Pose.Rehydrate(
            id,
            PoseName.Create(record.Name).Value ?? throw Invalid(record, "name"),
            Difficulty.FromCodes(record.BaseDifficulty, record.FlyerDifficulty).Value ?? throw Invalid(record, "difficulty"),
            FlowBoundaries.Create(record.CanStartFlow, record.CanEndFlow).Value!,
            record.SourceProposalId is { } source ? new SourceProposalId(source) : null,
            record.PublishedAt,
            PoseVersion.Of(record.Version),
            TagSet.Of(record.TagIds.Select(t => new TagId(t))));
        aggregates.Track(pose);
        return pose;
    }

    private static InvalidOperationException Invalid(PoseRecord record, string what) =>
        new($"Invalid stored {what} of the pose {record.Id}.");

    public Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return context.Set<PoseRecord>().AnyAsync(p => p.NameKey == key.Value, ct);
    }
}

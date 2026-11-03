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
        context.Set<PoseRecord>().Add(new PoseRecord
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
        });
        aggregates.Track(pose);
    }

    public Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return context.Set<PoseRecord>().AnyAsync(p => p.NameKey == key.Value, ct);
    }
}

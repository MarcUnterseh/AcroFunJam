using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>EF Core adapter of <see cref="ITagCarriersReader"/>: the tags of catalog.transitions, unnested and counted (ADR 0033).</summary>
public sealed class EfTagCarriersReader(AcroFunJamDbContext context) : ITagCarriersReader
{
    public async Task<IReadOnlyDictionary<TagId, int>> PublishedTransitionCounts(CancellationToken ct)
    {
        var counts = await context.Set<TransitionRecord>().AsNoTracking()
            .SelectMany(t => t.TagIds)
            .GroupBy(tag => tag)
            .Select(group => new { Tag = group.Key, Count = group.Count() })
            .ToListAsync(ct);
        return counts.ToDictionary(c => new TagId(c.Tag), c => c.Count);
    }

    public async Task<IReadOnlyList<CarryingTransition>> TransitionsCarrying(TagId tag, CancellationToken ct)
    {
        var rows = await (from t in context.Set<TransitionRecord>().AsNoTracking()
                          join start in context.Set<PoseRecord>().AsNoTracking() on t.FromPoseId equals start.Id
                          join end in context.Set<PoseRecord>().AsNoTracking() on t.ToPoseId equals end.Id
                          where t.TagIds.Contains(tag.Value)
                          select new { t.Id, t.FromPoseId, FromName = start.Name, t.ToPoseId, ToName = end.Name, t.Name }).ToListAsync(ct);
        // Stored data always met the rules when written: breaking them now is a bug.
        return [.. rows.Select(r => new CarryingTransition(
            r.Id, new PoseId(r.FromPoseId), PoseName.Create(r.FromName).Value!, new PoseId(r.ToPoseId), PoseName.Create(r.ToName).Value!,
            TransitionName.CreateOptional(r.Name).Value))];
    }
}

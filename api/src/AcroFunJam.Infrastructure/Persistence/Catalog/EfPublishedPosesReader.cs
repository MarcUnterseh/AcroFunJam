using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>EF Core adapter of <see cref="IPublishedPosesReader"/>: read-only projection of catalog.poses.</summary>
public sealed class EfPublishedPosesReader(AcroFunJamDbContext context) : IPublishedPosesReader
{
    public async Task<IReadOnlyList<PublishedPoseSummary>> GetPublishedPoses(CancellationToken ct)
    {
        var records = await context.Set<PoseRecord>().AsNoTracking().ToListAsync(ct);
        return records.Select(ToSummary).ToList();
    }

    private static PublishedPoseSummary ToSummary(PoseRecord record) =>
        new(
            new PoseId(record.Id),
            new PoseName(record.Name),
            ToDifficultyLevel(record.BaseDifficulty),
            ToDifficultyLevel(record.FlyerDifficulty));

    private static DifficultyLevel ToDifficultyLevel(string code) =>
        code switch
        {
            "discovery" => DifficultyLevel.Discovery,
            "beginner" => DifficultyLevel.Beginner,
            "intermediate" => DifficultyLevel.Intermediate,
            "advanced" => DifficultyLevel.Advanced,
            _ => throw new InvalidOperationException($"Unknown difficulty code '{code}' in catalog.poses."),
        };
}

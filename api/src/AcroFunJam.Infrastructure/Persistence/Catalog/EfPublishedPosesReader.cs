using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
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
            Valid(PoseName.Create(record.Name), $"name '{record.Name}'"),
            ToDifficultyLevel(record.BaseDifficulty),
            ToDifficultyLevel(record.FlyerDifficulty),
            Valid(FlowBoundaries.Create(record.CanStartFlow, record.CanEndFlow), "flow indicators"));

    /// <summary>Stored data always met the rules when written: breaking them now is a bug, reported as such.</summary>
    private static T Valid<T>(Result<T> value, string what) =>
        value.IsSuccess
            ? value.Value!
            : throw new InvalidOperationException($"Invalid {what} in catalog.poses: {value.Error!.Code}.");

    private static DifficultyLevel ToDifficultyLevel(string code) =>
        DifficultyLevel.FromCode(code) is { IsSuccess: true } level
            ? level.Value
            : throw new InvalidOperationException($"Unknown difficulty code '{code}' in catalog.poses.");
}

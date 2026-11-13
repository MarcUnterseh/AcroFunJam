using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>
/// EF Core adapter of <see cref="IPoseTransitionsReader"/>: read-only projection of catalog.transitions joined with the current
/// name of the other pose in catalog.poses (ADR 0030).
/// </summary>
public sealed class EfPoseTransitionsReader(AcroFunJamDbContext context) : IPoseTransitionsReader
{
    public async Task<IReadOnlyList<LinkedTransition>> TransitionsFrom(PoseId pose, CancellationToken ct) =>
        [.. (await (from t in context.Set<TransitionRecord>().AsNoTracking()
                    join other in context.Set<PoseRecord>().AsNoTracking() on t.ToPoseId equals other.Id
                    where t.FromPoseId == pose.Value
                    select new Row(t, other.Id, other.Name)).ToListAsync(ct)).Select(ToLinked)];

    public async Task<IReadOnlyList<LinkedTransition>> TransitionsTo(PoseId pose, CancellationToken ct) =>
        [.. (await (from t in context.Set<TransitionRecord>().AsNoTracking()
                    join other in context.Set<PoseRecord>().AsNoTracking() on t.FromPoseId equals other.Id
                    where t.ToPoseId == pose.Value
                    select new Row(t, other.Id, other.Name)).ToListAsync(ct)).Select(ToLinked)];

    private sealed record Row(TransitionRecord Transition, Guid OtherPoseId, string OtherPoseName);

    // Stored data always met the rules when written: breaking them now is a bug.
    private static LinkedTransition ToLinked(Row row) =>
        new(
            new TransitionId(row.Transition.Id),
            new PoseId(row.OtherPoseId),
            PoseName.Create(row.OtherPoseName).Value!,
            TransitionName.CreateOptional(row.Transition.Name).Value,
            Difficulty.FromCodes(row.Transition.BaseDifficulty, row.Transition.FlyerDifficulty).Value!,
            TransitionDescription.CreateOptional(row.Transition.Description).Value);
}

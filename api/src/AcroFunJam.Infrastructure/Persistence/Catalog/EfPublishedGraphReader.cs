using System.Data;
using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>
/// EF Core adapter of <see cref="IPublishedGraphReader"/> (ADR 0037): catalog.poses, catalog.transitions and the tags of the list, read in one read-only
/// snapshot (REPEATABLE READ), so that no transition points to a pose the read missed.
/// </summary>
public sealed class EfPublishedGraphReader(AcroFunJamDbContext context) : IPublishedGraphReader
{
    public async Task<PublishedGraphElements> Read(CancellationToken ct)
    {
        await using var snapshot = context.Database.CurrentTransaction is null
            ? await context.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct)
            : null;
        var poses = await context.Set<PoseRecord>().AsNoTracking().ToListAsync(ct);
        var transitions = await context.Set<TransitionRecord>().AsNoTracking().ToListAsync(ct);
        var tags = await context.Set<TagRecord>().AsNoTracking().Where(tag => tag.RemovedAt == null).ToListAsync(ct);
        return new PublishedGraphElements(
            [.. poses.Select(EfPublishedPosesReader.ToSummary).OrderBy(pose => pose.Name, PoseName.CatalogOrder)],
            [.. transitions.Select(ToSummary)],
            [.. tags.Select(tag => new NamedTag(new TagId(tag.Id), TagName.Create(tag.Name).Value!)).OrderBy(tag => tag.Name, TagName.CatalogOrder)]);
    }

    // Stored data always met the rules when written: breaking them now is a bug.
    private static PublishedTransitionSummary ToSummary(TransitionRecord record) =>
        new(
            new TransitionId(record.Id),
            new PoseId(record.FromPoseId),
            new PoseId(record.ToPoseId),
            TransitionName.CreateOptional(record.Name).Value,
            Difficulty.FromCodes(record.BaseDifficulty, record.FlyerDifficulty).Value!,
            TransitionDescription.CreateOptional(record.Description).Value,
            TagSet.Of(record.TagIds.Select(tag => new TagId(tag))));
}

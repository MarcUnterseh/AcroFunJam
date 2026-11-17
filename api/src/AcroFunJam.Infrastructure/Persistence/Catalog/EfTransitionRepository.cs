using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>EF Core adapter of <see cref="ITransitionRepository"/> (ADR 0028).</summary>
public sealed class EfTransitionRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : ITransitionRepository
{
    public void Add(Transition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        context.Set<TransitionRecord>().Add(new TransitionRecord
        {
            Id = transition.Id.Value,
            FromPoseId = transition.FromPose.Value,
            ToPoseId = transition.ToPose.Value,
            Name = transition.Name?.Value,
            NameKey = transition.Name?.Key.Value,
            BaseDifficulty = transition.Difficulty.Base.ToCode(),
            FlyerDifficulty = transition.Difficulty.Flyer.ToCode(),
            Description = transition.Description?.Value,
            TagIds = [.. transition.Tags.Ids.Select(t => t.Value)],
            SourceProposalId = transition.SourceProposalId?.Value,
            PublishedAt = transition.PublishedAt,
        });
        aggregates.Track(transition);
    }

    public async Task<Transition?> GetById(TransitionId id, CancellationToken ct)
    {
        var record = await context.Set<TransitionRecord>().AsNoTracking().SingleOrDefaultAsync(t => t.Id == id.Value, ct);
        if (record is null) return null;

        // Stored data always met the rules when written: breaking them now is a bug.
        var transition = Transition.Rehydrate(
            id,
            new PoseId(record.FromPoseId),
            new PoseId(record.ToPoseId),
            TransitionName.CreateOptional(record.Name).Value,
            Difficulty.FromCodes(record.BaseDifficulty, record.FlyerDifficulty).Value!,
            TransitionDescription.CreateOptional(record.Description).Value,
            TagSet.Of(record.TagIds.Select(t => new TagId(t))),
            record.SourceProposalId is { } source ? new SourceProposalId(source) : null,
            record.PublishedAt);
        aggregates.Track(transition);
        return transition;
    }

    /// <summary>Only its tags change once published (ADR 0033): UPDATE … SET tag_ids, the last action winning.</summary>
    public void Update(Transition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        var record = new TransitionRecord
        {
            Id = transition.Id.Value,
            BaseDifficulty = transition.Difficulty.Base.ToCode(),
            FlyerDifficulty = transition.Difficulty.Flyer.ToCode(),
            TagIds = [.. transition.Tags.Ids.Select(t => t.Value)],
        };
        context.Set<TransitionRecord>().Attach(record).Property(t => t.TagIds).IsModified = true;
        aggregates.Track(transition);
    }

    public Task<bool> IsSlotTaken(PoseId from, PoseId to, TransitionNameKey? nameKey, CancellationToken ct)
    {
        var key = nameKey?.Value;
        return context.Set<TransitionRecord>().AnyAsync(t => t.FromPoseId == from.Value && t.ToPoseId == to.Value && t.NameKey == key, ct);
    }
}
